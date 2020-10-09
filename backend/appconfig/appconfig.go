package appconfig

import (
	"github.com/ksensehq/eventnative/logging"
	"github.com/spf13/viper"
	"io"
)

type AppConfig struct {
	ServerName string
	Authority  string

	closeMe []io.Closer
}

var Instance *AppConfig

func setDefaultParams() {
	viper.SetDefault("server.port", "8001")
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

	err := logging.InitGlobalLogger(logging.Config{
		LoggerName:  "main",
		ServerName:  serverName,
		FileDir:     viper.GetString("server.log.path"),
		RotationMin: viper.GetInt64("server.log.rotation_min"),
		MaxBackups:  viper.GetInt("server.log.max_backups")})
	if err != nil {
		return err
	}

	logging.Info("*** Creating new AppConfig ***")

	Instance = &appConfig
	return nil
}

func (a *AppConfig) ScheduleClosing(c io.Closer) {
	a.closeMe = append(a.closeMe, c)
}

func (a *AppConfig) Close() {
	for _, cl := range a.closeMe {
		if err := cl.Close(); err != nil {
			logging.Error(err)
		}
	}
}
