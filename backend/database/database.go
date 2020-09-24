package database

import (
	"errors"
	heroku "github.com/heroku/heroku-go/v5"
	"github.com/spf13/viper"
)

type DBProvider interface {
	CreateDatabase(userId string) string
}

type HerokuDbService struct {
	HerokuService *heroku.Service
}

func (herokuDbService *HerokuDbService) CreateDatabase(userId string) string {
	return "testdb"
}

func NewDatabaseProvider(dbProviderViper *viper.Viper) (DBProvider, error) {
	if dbProviderViper.IsSet("heroku") {
		username := dbProviderViper.GetString("heroku.username")
		password := dbProviderViper.GetString("heroku.password")
		if username == "" || password == "" {
			return nil, errors.New("heroku username and password are required")
		}
		heroku.DefaultTransport.Username = username
		heroku.DefaultTransport.Password = password
		return &HerokuDbService{heroku.NewService(heroku.DefaultClient)}, nil
	}
	return nil, errors.New("DB provider is not configured")
}
