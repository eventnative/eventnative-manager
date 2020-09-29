package db_provider

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"github.com/ksensehq/enhosted/config"
	"github.com/ksensehq/enhosted/random"
	_ "github.com/lib/pq"
	"github.com/spf13/viper"
	"log"
	"strings"
)

type DBProvider interface {
	CreateDatabase(userId string) (*DBCredentials, error)
}

type HostedDBProvider struct {
	ctx        context.Context
	config     *config.DbConfig
	dataSource *sql.DB
}

type DBCredentials struct {
	Host     string `json:"host"`
	Port     uint   `json:"port"`
	Database string `json:"database"`
	User     string `json:"user"`
	Password string `json:"password"`
}

func (provider *HostedDBProvider) CreateDatabase(userId string) (*DBCredentials, error) {
	rows, err := provider.dataSource.Query("SELECT internal_user_id, database_id, password FROM tmp_users_db where external_user_id = '" + userId + "'")
	if rows != nil && rows.Next() {
		defer rows.Close()
		var internalUserId string
		var database string
		var password string
		err := rows.Scan(&internalUserId, &database, &password)
		if err != nil {
			return nil, err
		}
		return &DBCredentials{Host: provider.config.Host, Port: provider.config.Port, Database: database, User: internalUserId, Password: password}, nil
	}
	db := strings.ToLower(random.String(10))
	log.Println("db " + db)
	_, err = provider.dataSource.Exec("CREATE DATABASE " + db)
	if err != nil {
		return nil, err
	}
	tx, err := provider.dataSource.BeginTx(provider.ctx, nil)
	if err != nil {
		return nil, err
	}
	username := strings.ToLower(random.AlphabeticalString(10))
	log.Println("username: " + username)
	password := random.String(16)
	log.Println("Password " + password)
	userCreationQuery := fmt.Sprintf("CREATE USER %s WITH PASSWORD '%s';", username, password)
	log.Println("User creation query: " + userCreationQuery)
	_, err = tx.Exec(userCreationQuery)
	if err != nil {
		rollbackTransaction(tx)
		return nil, err
	}
	insertNewDbQuery := fmt.Sprintf("INSERT INTO tmp_users_db(external_user_id, internal_user_id, database_id, password) "+
		"VALUES ('%s', '%s', '%s', '%s')", userId, username, db, password)
	_, err = tx.Exec(insertNewDbQuery)
	if err != nil {
		rollbackTransaction(tx)
		return nil, err
	}
	grantAccessQuery := fmt.Sprintf(
		"GRANT CONNECT ON DATABASE %s TO %s; "+
			"GRANT USAGE ON SCHEMA public TO %s; "+
			"GRANT SELECT ON ALL TABLES IN SCHEMA public TO %s;",
		db, username, username, username)
	_, err = tx.Exec(grantAccessQuery)
	if err != nil {
		rollbackTransaction(tx)
		return nil, err
	}
	commitErr := tx.Commit()
	if commitErr != nil {
		return nil, commitErr
	}
	return &DBCredentials{Host: provider.config.Host, Port: provider.config.Port, Database: db, User: username, Password: password}, nil
}

func rollbackTransaction(tx *sql.Tx) {
	if rollbackErr := tx.Rollback(); rollbackErr != nil {
		log.Printf("System error: unable to rollback transaction: %v", rollbackErr)
	}
}

func NewDatabaseProvider(dbProviderViper *viper.Viper) (DBProvider, error) {
	host := dbProviderViper.GetString("host")
	port := dbProviderViper.GetUint("port")
	username := dbProviderViper.GetString("username")
	password := dbProviderViper.GetString("password")
	db := dbProviderViper.GetString("db")
	if host == "" || username == "" || password == "" {
		return nil, errors.New("Host, username and password are required to configure db_provider")
	}

	dbConfig := &config.DbConfig{Host: host, Port: port, Username: username, Password: password, Db: db}
	connectionString := dbConfig.GetConnectionString()
	dataSource, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}
	_, err = dataSource.Exec("CREATE TABLE IF NOT EXISTS tmp_users_db (external_user_id varchar PRIMARY KEY, " +
		"internal_user_id varchar, database_id varchar, password varchar);")
	if err != nil {
		return nil, err
	}
	return &HostedDBProvider{ctx: context.Background(), config: dbConfig, dataSource: dataSource}, nil
}
