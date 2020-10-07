package main

import (
	"context"
	"flag"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/appconfig"
	"github.com/ksensehq/enhosted/authorization"
	"github.com/ksensehq/enhosted/destinations"
	"github.com/ksensehq/enhosted/handlers"
	"github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/enhosted/storages"
	enadapters "github.com/ksensehq/eventnative/adapters"
	"github.com/ksensehq/eventnative/logging"
	enstorages "github.com/ksensehq/eventnative/storages"
	"github.com/spf13/viper"
	"os"
	"os/signal"
	"syscall"

	"net/http"
	"strings"
	"time"
)

func main() {
	configFilePath := flag.String("cfg", "", "config file path")
	flag.Parse()
	readConfiguration(*configFilePath)

	//listen to shutdown signal to free up all resources
	ctx, cancel := context.WithCancel(context.Background())
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGTERM, syscall.SIGINT, syscall.SIGKILL, syscall.SIGHUP)
	go func() {
		<-c
		cancel()
		appconfig.Instance.Close()
		time.Sleep(1 * time.Second)
		os.Exit(0)
	}()

	//statistics postgres
	pgDestinationConfig := enstorages.DestinationConfig{}
	if err := viper.UnmarshalKey("destinations.statistics.postgres", &pgDestinationConfig); err != nil {
		logging.Fatal("Error unmarshalling statistics postgres config:", err)
	}
	if err := pgDestinationConfig.DataSource.Validate(); err != nil {
		logging.Fatal("Error validation statistics postgres config:", err)
	}

	//default s3
	s3Config := enadapters.S3Config{}
	if err := viper.UnmarshalKey("destinations.hosted.s3", &s3Config); err != nil {
		logging.Fatal("Error unmarshalling default s3 config:", err)
	}
	if err := s3Config.Validate(); err != nil {
		logging.Fatal("Error validation default s3 config:", err)
	}

	//auth service
	authFirebaseViper := viper.Sub("auth.firebase")
	if authFirebaseViper == nil {
		logging.Fatal("auth is not set properly. Only firebase is supported now")
	}
	authService, err := authorization.NewService(ctx, authFirebaseViper)
	if err != nil {
		logging.Fatal("Failed to configure auth service:", err)
	}
	appconfig.Instance.ScheduleClosing(authService)

	//default destination
	pgDestinationViper := viper.Sub("destinations.default.postgres")
	if pgDestinationViper == nil {
		logging.Fatal("destinations.default is not set properly. Only postgres is supported now")
	}
	pgDestination, err := destinations.NewPostgres(ctx, pgDestinationViper)
	if err != nil {
		logging.Fatal("destinations.default is not set properly. Only postgres is supported now")
	}

	//main storage
	firebaseViper := viper.Sub("storage.firebase")
	if firebaseViper == nil {
		logging.Fatal("storage is not set properly. Only firebase is supported now")
	}
	firebaseStorage, err := storages.NewFirebase(ctx, firebaseViper, pgDestination)
	if err != nil {
		logging.Fatal("Failed to create firebase storage: %s", err)
	}
	appconfig.Instance.ScheduleClosing(firebaseStorage)

	staticFilesPath := viper.GetString("server.static_files_dir")
	logging.Infof("Static files serving path: [%s]\n", staticFilesPath)
	router := SetupRouter(staticFilesPath, firebaseStorage, authService, s3Config, pgDestinationConfig)
	server := &http.Server{
		Addr:              appconfig.Instance.Authority,
		Handler:           middleware.Cors(router),
		ReadTimeout:       time.Second * 60,
		ReadHeaderTimeout: time.Second * 60,
		IdleTimeout:       time.Second * 65,
	}
	logging.Fatal(server.ListenAndServe())
}

func readConfiguration(configFilePath string) {
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	if configFilePath != "" {
		logging.Infof("Reading config from %s\n", configFilePath)
	}
	viper.SetConfigFile(configFilePath)
	if err := viper.ReadInConfig(); err != nil {
		if viper.ConfigFileUsed() != "" {
			logging.Fatal("Could not read file", viper.ConfigFileUsed())
		}
	}
	if err := appconfig.Init(); err != nil {
		logging.Fatal(err)
	}
}

func SetupRouter(staticContentDirectory string, storage *storages.Firebase, authService *authorization.Service,
	defaultS3 enadapters.S3Config, statisticsPostgres enstorages.DestinationConfig) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()

	router.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	serverToken := viper.GetString("server.auth")

	apiV1 := router.Group("/api/v1")
	{
		apiV1.POST("/database", middleware.ClientAuth(handlers.NewDatabaseHandler(storage).PostHandler, authService))

		apiV1.GET("/destinations", middleware.ServerAuth(handlers.NewDestinationsHandler(storage, defaultS3, statisticsPostgres).GetHandler, serverToken))
		apiV1.GET("/apikeys", middleware.ServerAuth(handlers.NewApiKeysHandler(storage).GetHandler, serverToken))
	}
	router.Use(static.Serve("/", static.LocalFile(staticContentDirectory, false)))
	return router
}
