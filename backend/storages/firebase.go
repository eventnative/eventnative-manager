package storages

import (
	"cloud.google.com/go/firestore"
	"context"
	"errors"
	firebase "firebase.google.com/go/v4"
	"fmt"
	"github.com/hashicorp/go-multierror"
	"github.com/ksensehq/enhosted/destinations"
	"github.com/ksensehq/enhosted/entities"
	_ "github.com/lib/pq"
	"github.com/spf13/viper"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"time"
)

const (
	defaultDatabaseCredentialsCollection = "default_database_credentials"
	destinationsCollection               = "destinations"
	apiKeysCollection                    = "api_keys"
	customDomainsCollection              = "custom_domains"
	lastUpdatedField                     = "_lastUpdated"

	LastUpdatedLayout = "2006-01-02T15:04:05.000Z"
)

var ErrNoFound = errors.New("Collection wasn't found")

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
			database, err := fb.defaultDestination.CreateDatabase(projectId)
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
	database := &entities.Database{}
	err = credentials.DataTo(database)
	if err != nil {
		return nil, fmt.Errorf("Error parsing database entity for [%s] project: %v", projectId, err)
	}
	return database, err
}

func (fb *Firebase) GetDestinationsLastUpdated() (*time.Time, error) {
	result := fb.client.Collection(destinationsCollection).Select(lastUpdatedField).OrderBy(lastUpdatedField, firestore.Desc).Limit(1).Documents(fb.ctx)

	docs, err := result.GetAll()
	if err != nil {
		return nil, fmt.Errorf("Error getting destinations _lastUpdated: %v", err)
	}

	if len(docs) == 0 {
		return nil, errors.New("Empty destinations _lastUpdated")
	}

	destinationsEntity := &entities.Destinations{}
	err = docs[0].DataTo(destinationsEntity)
	if err != nil {
		return nil, fmt.Errorf("Error parsing last updated destination of [%s] project: %v", docs[0].Ref.ID, err)
	}

	t, err := time.Parse(LastUpdatedLayout, destinationsEntity.LastUpdated)
	if err != nil {
		return nil, fmt.Errorf("Error parsing [%s] field into [%s] layout: %v", lastUpdatedField, LastUpdatedLayout, err)
	}

	return &t, nil
}

//GetDestinations() return map with projectId:destinations
func (fb *Firebase) GetDestinations() (map[string]*entities.Destinations, error) {
	result := map[string]*entities.Destinations{}
	docIterator := fb.client.Collection(destinationsCollection).DocumentRefs(fb.ctx)
	for {
		document, err := docIterator.Next()
		if err != nil {
			if err == iterator.Done {
				break
			}

			return nil, fmt.Errorf("Error getting destinations: %v", err)
		}

		data, err := document.Get(fb.ctx)
		if err != nil {
			return nil, fmt.Errorf("Error getting destinations of project [%s]: %v", document.ID, err)
		}

		destinationsEntity := &entities.Destinations{}
		err = data.DataTo(destinationsEntity)
		if err != nil {
			return nil, fmt.Errorf("Error parsing destinations of project [%s]: %v", document.ID, err)
		}

		result[document.ID] = destinationsEntity
	}
	return result, nil
}

func (fb *Firebase) GetDestinationsByProjectId(projectId string) ([]*entities.Destination, error) {
	doc, err := fb.client.Collection(destinationsCollection).Doc(projectId).Get(fb.ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return make([]*entities.Destination, 0), nil
		} else {
			return nil, fmt.Errorf("error getting destinations by projectId [%s]: %v", projectId, err)
		}
	}

	dest := &entities.Destinations{}
	err = doc.DataTo(dest)
	if err != nil {
		return nil, fmt.Errorf("error parsing destinations of projectId [%s]: %v", projectId, err)
	}
	return dest.Destinations, nil
}

func (fb *Firebase) GetApiKeysLastUpdated() (*time.Time, error) {
	result := fb.client.Collection(apiKeysCollection).Select(lastUpdatedField).OrderBy(lastUpdatedField, firestore.Desc).Limit(1).Documents(fb.ctx)

	docs, err := result.GetAll()
	if err != nil {
		return nil, fmt.Errorf("Error getting apikeys _lastUpdated: %v", err)
	}

	if len(docs) == 0 {
		return nil, errors.New("Empty apikeys _lastUpdated")
	}

	apiKeysEntity := &entities.ApiKeys{}
	err = docs[0].DataTo(apiKeysEntity)
	if err != nil {
		return nil, fmt.Errorf("Error parsing last updated apikeys of [%s] project: %v", docs[0].Ref.ID, err)
	}

	t, err := time.Parse(LastUpdatedLayout, apiKeysEntity.LastUpdated)
	if err != nil {
		return nil, fmt.Errorf("Error parsing [%s] field into [%s] layout: %v", lastUpdatedField, LastUpdatedLayout, err)
	}

	return &t, nil
}

func (fb *Firebase) GetApiKeys() ([]*entities.ApiKey, error) {
	var result []*entities.ApiKey
	docIterator := fb.client.Collection(apiKeysCollection).DocumentRefs(fb.ctx)
	for {
		document, err := docIterator.Next()
		if err != nil {
			if err == iterator.Done {
				break
			}

			return nil, fmt.Errorf("Error reading api keys: %v", err)
		}

		data, err := document.Get(fb.ctx)
		if err != nil {
			return nil, fmt.Errorf("Error getting api keys of project [%s]: %v", document.ID, err)
		}

		apiKeys := &entities.ApiKeys{}
		err = data.DataTo(apiKeys)
		if err != nil {
			return nil, fmt.Errorf("Error parsing api keys: %v", err)
		}

		result = append(result, apiKeys.Keys...)
	}
	return result, nil
}

func (fb *Firebase) GetApiKeysByProjectId(projectId string) ([]*entities.ApiKey, error) {
	doc, err := fb.client.Collection(apiKeysCollection).Doc(projectId).Get(fb.ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return make([]*entities.ApiKey, 0), nil
		} else {
			return nil, fmt.Errorf("Error getting api keys by projectId [%s]: %v", projectId, err)
		}
	}

	apiKeys := &entities.ApiKeys{}
	err = doc.DataTo(apiKeys)
	if err != nil {
		return nil, fmt.Errorf("Error parsing api keys of projectId [%s]: %v", projectId, err)
	}

	return apiKeys.Keys, nil
}

func (fb *Firebase) GetCustomDomains() (map[string]*entities.CustomDomains, error) {
	docIterator := fb.client.Collection(customDomainsCollection).DocumentRefs(fb.ctx)
	var result = map[string]*entities.CustomDomains{}
	for {
		document, err := docIterator.Next()
		if err != nil {
			if err == iterator.Done {
				break
			}

			return nil, fmt.Errorf("error reading custom domains: %v", err)
		}

		projectId := document.ID
		data, err := document.Get(fb.ctx)
		if err != nil {
			return nil, fmt.Errorf("error getting custom domains of project [%s]: %v", document.ID, err)
		}

		customDomains := &entities.CustomDomains{}
		err = data.DataTo(customDomains)
		if err != nil {
			return nil, fmt.Errorf("error parsing custom domains: %v", err)
		}
		result[projectId] = customDomains
	}
	return result, nil
}

func (fb *Firebase) GetCustomDomainsByProjectId(projectId string) (*entities.CustomDomains, error) {
	doc, err := fb.client.Collection(customDomainsCollection).Doc(projectId).Get(fb.ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, ErrNoFound
		} else {
			return nil, fmt.Errorf("error getting custom domains of projectId [%s]: %v", projectId, err)
		}
	}
	customDomains := &entities.CustomDomains{}
	err = doc.DataTo(customDomains)
	if err != nil {
		return nil, fmt.Errorf("error parsing custom domains of projectId [%s]: %v", projectId, err)
	}
	return customDomains, nil
}

func (fb *Firebase) UpdateCustomDomain(projectId string, customDomains *entities.CustomDomains) error {
	_, err := fb.client.Collection(customDomainsCollection).Doc(projectId).Set(fb.ctx, customDomains)
	return err
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
