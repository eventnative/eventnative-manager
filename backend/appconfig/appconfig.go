package appconfig

import (
	"github.com/jitsucom/eventnative/logging"
	"github.com/spf13/viper"
	"io"
	"os"
)

type AppConfig struct {
	ServerName string
	Authority  string

	closeMe []io.Closer
}

var Instance *AppConfig

func setDefaultParams() {
	viper.SetDefault("server.port", "8001")
	viper.SetDefault("server.domain", ".jitsu.com")
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

	globalLoggerConfig := logging.Config{
		FileName:    serverName + "-main",
		FileDir:     viper.GetString("server.log.path"),
		RotationMin: viper.GetInt64("server.log.rotation_min"),
		MaxBackups:  viper.GetInt("server.log.max_backups")}
	var globalLogsWriter io.Writer
	if globalLoggerConfig.FileDir != "" {
		fileWriter := logging.NewRollingWriter(globalLoggerConfig)
		globalLogsWriter = logging.Dual{
			FileWriter: fileWriter,
			Stdout:     os.Stdout,
		}
	} else {
		globalLogsWriter = os.Stdout
	}
	err := logging.InitGlobalLogger(globalLogsWriter)
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
