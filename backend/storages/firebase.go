package storages

import (
	"cloud.google.com/go/firestore"
	"context"
	firebase "firebase.google.com/go/v4"
	"fmt"
	"github.com/hashicorp/go-multierror"
	"github.com/ksensehq/enhosted/destinations"
	"github.com/ksensehq/enhosted/entities"
	_ "github.com/lib/pq"
	"github.com/spf13/viper"
	"google.golang.org/api/option"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	//firebase "firebase.google.com/go"
)

const defaultDatabaseCredentialsCollection = "default_database_credentials"

type Firebase struct {
	ctx                context.Context
	client             *firestore.Client
	defaultDestination *destinations.Postgres
}

func NewFirebase(ctx context.Context, firebaseViper *viper.Viper, defaultDestination *destinations.Postgres) (*Firebase, error) {
	fbConfig := &firebase.Config{ProjectID: firebaseViper.GetString("project_id")}
	app, err := firebase.NewApp(ctx, fbConfig, option.WithCredentialsFile(firebaseViper.GetString("credentials_file")))
	if err != nil {
		return nil, err
	}

	firestoreClient, err := app.Firestore(ctx)
	if err != nil {
		return nil, err
	}

	return &Firebase{ctx: ctx, client: firestoreClient, defaultDestination: defaultDestination}, nil
}

func (fb *Firebase) CreateDatabase(projectId string) (*entities.Database, error) {
	credentials, err := fb.client.Collection(defaultDatabaseCredentialsCollection).Doc(projectId).Get(fb.ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			//create new
			database, err := fb.defaultDestination.CreateDatabase()
			if err != nil {
				return nil, fmt.Errorf("Error creating postgres default destination for projectId: [%s]: %v", projectId, err)
			}

			_, err = fb.client.Collection(defaultDatabaseCredentialsCollection).Doc(projectId).Create(fb.ctx, database)
			if err != nil {
				return nil, err
			}
			return database, nil
		} else {
			return nil, err
		}
	}
	//parse
	rawCredentials := credentials.Data()
	database := fmt.Sprint(rawCredentials["Database"])
	host := fmt.Sprint(rawCredentials["Host"])
	username := fmt.Sprint(rawCredentials["User"])
	password := fmt.Sprint(rawCredentials["Password"])
	port := fmt.Sprint(rawCredentials["Port"])
	return &entities.Database{Host: host, Port: port, User: username, Password: password, Database: database}, nil
}

func (fb *Firebase) Close() (multiErr error) {
	if err := fb.defaultDestination.Close(); err != nil {
		multiErr = multierror.Append(multiErr, err)
	}

	if err := fb.client.Close(); err != nil {
		multiErr = multierror.Append(multiErr, fmt.Errorf("Error closing firestore client in storage: %v", err))
	}

	return
}
