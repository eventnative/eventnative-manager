package db_provider

import (
	"cloud.google.com/go/firestore"
	"context"
	"database/sql"
	"errors"
	firebase "firebase.google.com/go"
	"fmt"
	"github.com/ksensehq/enhosted/config"
	"github.com/ksensehq/enhosted/random"
	_ "github.com/lib/pq"
	"github.com/spf13/viper"
	"google.golang.org/api/option"
	"log"
	"strings"
	"time"
	//firebase "firebase.google.com/go"
)

type DBProvider interface {
	CreateDatabase(userId string) (*DBCredentials, error)
	GetDatabase(userId string) (*DBCredentials, error)
}

type DBCredentials struct {
	Host     string `json:"pghost"`
	Port     string `json:"pgport"`
	Database string `json:"pgdatabase"`
	User     string `json:"pguser"`
	Password string `json:"pgpassword"`
}

var usersTableName = "users_table"

type PostgresDBProvider struct {
	ctx        context.Context
	config     *config.DbConfig
	dataSource *sql.DB
}

func (provider *PostgresDBProvider) GetDatabase(userId string) (*DBCredentials, error) {
	database, err := getUserDatabase(userId, provider)
	if err != nil {
		return nil, err
	}
	if database == nil {
		return nil, errors.New("No database exists for user " + userId)
	}
	return database, nil
}

func (provider *PostgresDBProvider) CreateDatabase(userId string) (*DBCredentials, error) {
	credentials, err := getUserDatabase(userId, provider)
	if err != nil {
		return nil, err
	}
	if credentials != nil {
		return credentials, nil
	}
	credentials, err = createPostgresDatabase(provider.config, provider.dataSource, provider.ctx)
	return credentials, err
}

func getUserDatabase(userId string, provider *PostgresDBProvider) (*DBCredentials, error) {
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

type FirebaseDBProvider struct {
	ctx                   context.Context
	credentialsClient     *firestore.Client
	destinationDatasource *sql.DB
	destinationConfig     *config.DbConfig
}

func (provider *FirebaseDBProvider) GetDatabase(projectId string) (*DBCredentials, error) {
	credentials, err := provider.credentialsClient.Collection("default_database_credentials").Doc(projectId).Get(provider.ctx)
	if err != nil {
		return nil, err
	}
	rawCredentials := credentials.Data()
	database := fmt.Sprint(rawCredentials["Database"])
	host := fmt.Sprint(rawCredentials["Host"])
	username := fmt.Sprint(rawCredentials["User"])
	password := fmt.Sprint(rawCredentials["Password"])
	port := fmt.Sprint(rawCredentials["Port"])
	return &DBCredentials{Host: host, Port: port, User: username, Password: password, Database: database}, nil
}

func (provider *FirebaseDBProvider) CreateDatabase(projectId string) (*DBCredentials, error) {
	credentials, err := provider.GetDatabase(projectId)
	if err == nil {
		return credentials, nil
	}
	generatedCredentials, err := createPostgresDatabase(provider.destinationConfig, provider.destinationDatasource, provider.ctx)
	if err != nil {
		return nil, err
	}
	_, err = provider.credentialsClient.Collection("default_database_credentials").Doc(projectId).Create(provider.ctx, generatedCredentials)
	if err != nil {
		return nil, err
	}
	return generatedCredentials, nil
}

func createPostgresDatabase(dbConfig *config.DbConfig, destinationDatasource *sql.DB, ctx context.Context) (*DBCredentials, error) {
	db := strings.ToLower(random.AlphabeticalString(4)) + time.Now().Format("200601021504")
	log.Println("db " + db)
	_, err := destinationDatasource.Exec("CREATE DATABASE " + db)
	if err != nil {
		return nil, err
	}
	_, err = destinationDatasource.Exec("REVOKE ALL on database " + db + " FROM public;")
	if err != nil {
		return nil, err
	}
	tx, err := destinationDatasource.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	var queries []string
	username := strings.ToLower(random.AlphabeticalString(4)) + time.Now().Format("200601021504")
	log.Println("Generated username: " + username)
	password := random.String(16)
	log.Println("Generated password: " + password)
	queries = append(queries, fmt.Sprintf("CREATE USER %s WITH PASSWORD '%s';", username, password))
	queries = append(queries, fmt.Sprintf("GRANT CONNECT ON DATABASE %s TO %s;", db, username))
	err = executeQueriesInTx(queries, tx)
	if err != nil {
		return nil, err
	}
	commitErr := tx.Commit()
	if commitErr != nil {
		return nil, commitErr
	}
	generatedCredentials := DBCredentials{Host: dbConfig.ReplicaHost, Port: dbConfig.Port, Database: db, User: username, Password: password}
	return &generatedCredentials, nil
}

func NewDatabaseProvider(dbProviderViper *viper.Viper) (DBProvider, error) {
	if dbProviderViper.IsSet("firebase") {
		ctx := context.Background()
		fbConfig := &firebase.Config{ProjectID: dbProviderViper.GetString("firebase.project_id")}
		app, err := firebase.NewApp(ctx, fbConfig, option.WithCredentialsFile(dbProviderViper.GetString("firebase.credentials_file")))
		if err != nil {
			return nil, err
		}
		firestoreClient, err := app.Firestore(ctx)
		if err != nil {
			return nil, err
		}
		host := dbProviderViper.GetString("default_destination.host")
		replicaHost := dbProviderViper.GetString("default_destination.public_host")
		if replicaHost == "" {
			replicaHost = host
		}
		port := dbProviderViper.GetUint("default_destination.port")
		username := dbProviderViper.GetString("default_destination.username")
		password := dbProviderViper.GetString("default_destination.password")
		db := dbProviderViper.GetString("default_destination.database")
		if host == "" || username == "" || password == "" || db == "" {
			return nil, errors.New("host, database, username and password are required to configure db_provider")
		}
		destinationConfig := config.DbConfig{Host: host, ReplicaHost: replicaHost, Port: fmt.Sprint(port), Username: username, Password: password, Db: db}
		connectionString := destinationConfig.GetConnectionString()
		dataSource, err := sql.Open("postgres", connectionString)
		return &FirebaseDBProvider{ctx: ctx, credentialsClient: firestoreClient, destinationConfig: &destinationConfig, destinationDatasource: dataSource}, nil
	} else {
		return nil, errors.New("unknown db_provider type, only firebase is supported")
	}

}
