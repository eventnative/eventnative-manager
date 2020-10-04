package appconfig

import (
	"github.com/spf13/viper"
)

type AppConfig struct {
	ServerName string
	Authority  string
}

var Instance *AppConfig

func setDefaultParams() {
	viper.SetDefault("server.port", "8001")
	viper.SetDefault("db_provider.default_destination.postgres.port", 5432)
}

func Init() error {
	setDefaultParams()

	var appConfig AppConfig
	serverName := viper.GetString("server.name")
	if serverName == "" {
		serverName = "unnamed-server"
	}
	appConfig.ServerName = serverName
	var port = viper.GetString("server.port")
	appConfig.Authority = "0.0.0.0:" + port
	Instance = &appConfig
	return nil
}
