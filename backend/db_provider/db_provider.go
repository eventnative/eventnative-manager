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
	"time"
)

type DBProvider interface {
	CreateDatabase(userId string) (*DBCredentials, error)
	GetDatabase(userId string) (*DBCredentials, error)
}

type HostedDBProvider struct {
	ctx        context.Context
	config     *config.DbConfig
	dataSource *sql.DB
}

type DBCredentials struct {
	Host     string `json:"pghost"`
	Port     uint   `json:"pgport"`
	Database string `json:"pgdatabase"`
	User     string `json:"pguser"`
	Password string `json:"pgpassword"`
}

var usersTableName = "users_table"

func (provider *HostedDBProvider) GetDatabase(userId string) (*DBCredentials, error) {
	database, err := getUserDatabase(userId, provider)
	if err != nil {
		return nil, err
	}
	if database == nil {
		return nil, errors.New("No database exists for user " + userId)
	}
	return database, nil
}

func (provider *HostedDBProvider) CreateDatabase(userId string) (*DBCredentials, error) {
	credentials, err := getUserDatabase(userId, provider)
	if err != nil {
		return nil, err
	}
	if credentials != nil {
		return credentials, nil
	}
	db := strings.ToLower(random.AlphabeticalString(4)) + time.Now().Format("200601021504")
	log.Println("db " + db)
	_, err = provider.dataSource.Exec("CREATE DATABASE " + db)
	if err != nil {
		return nil, err
	}
	_, err = provider.dataSource.Exec("REVOKE ALL on database " + db + " FROM public;")
	if err != nil {
		return nil, err
	}
	tx, err := provider.dataSource.BeginTx(provider.ctx, nil)
	if err != nil {
		return nil, err
	}
	var queries []string
	username := strings.ToLower(random.AlphabeticalString(4)) + time.Now().Format("200601021504")
	log.Println("Generated username: " + username)
	password := random.String(16)
	log.Println("Generated password: " + password)
	queries = append(queries, fmt.Sprintf("CREATE USER %s WITH PASSWORD '%s';", username, password))
	queries = append(queries, fmt.Sprintf("INSERT INTO "+usersTableName+
		" (external_user_id, db_user_id, database_id, password) "+
		"VALUES ('%s', '%s', '%s', '%s')", userId, username, db, password))
	queries = append(queries, fmt.Sprintf("GRANT CONNECT ON DATABASE %s TO %s;", db, username))
	err = executeQueriesInTx(queries, tx)
	if err != nil {
		return nil, err
	}
	commitErr := tx.Commit()
	if commitErr != nil {
		return nil, commitErr
	}
	return &DBCredentials{Host: provider.config.ReplicaHost, Port: provider.config.Port, Database: db, User: username, Password: password}, nil
}

func getUserDatabase(userId string, provider *HostedDBProvider) (*DBCredentials, error) {
	rows, _ := provider.dataSource.Query("SELECT db_user_id, database_id, password FROM " + usersTableName + " where external_user_id = '" + userId + "'")
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
	return nil, nil
}

func executeQueriesInTx(queries []string, transaction *sql.Tx) error {
	for i := range queries {
		_, err := transaction.Exec(queries[i])
		if err != nil {
			if rollbackErr := transaction.Rollback(); rollbackErr != nil {
				log.Printf("System error: unable to rollback transaction: %v", rollbackErr)
			}
			return err
		}
	}
	return nil
}

func NewDatabaseProvider(dbProviderViper *viper.Viper) (DBProvider, error) {
	replicaHost := dbProviderViper.GetString("public_host")
	if replicaHost == "" {
		replicaHost = dbProviderViper.GetString("host")
	}
	host := dbProviderViper.GetString("host")
	port := dbProviderViper.GetUint("port")
	username := dbProviderViper.GetString("username")
	password := dbProviderViper.GetString("password")
	db := dbProviderViper.GetString("database")
	if host == "" || username == "" || password == "" || db == "" {
		return nil, errors.New("host, database, username and password are required to configure db_provider")
	}
	dbConfig := &config.DbConfig{Host: host, Port: port, Username: username, Password: password, Db: db, ReplicaHost: replicaHost}
	connectionString := dbConfig.GetConnectionString()
	dataSource, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}
	_, err = dataSource.Exec("CREATE TABLE IF NOT EXISTS " + usersTableName + " (external_user_id varchar PRIMARY KEY, " +
		"db_user_id varchar, database_id varchar, password varchar, CONSTRAINT database_id_unq UNIQUE(database_id));")
	if err != nil {
		return nil, err
	}
	return &HostedDBProvider{ctx: context.Background(), config: dbConfig, dataSource: dataSource}, nil
}
