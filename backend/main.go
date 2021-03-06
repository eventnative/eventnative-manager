package main

import (
	"context"
	"flag"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/jitsucom/enhosted/appconfig"
	"github.com/jitsucom/enhosted/authorization"
	"github.com/jitsucom/enhosted/destinations"
	"github.com/jitsucom/enhosted/eventnative"
	"github.com/jitsucom/enhosted/handlers"
	"github.com/jitsucom/enhosted/middleware"
	"github.com/jitsucom/enhosted/ssh"
	"github.com/jitsucom/enhosted/ssl"
	"github.com/jitsucom/enhosted/statistics"
	"github.com/jitsucom/enhosted/storages"
	enadapters "github.com/jitsucom/eventnative/adapters"
	"github.com/jitsucom/eventnative/logging"
	"github.com/jitsucom/eventnative/notifications"
	"github.com/jitsucom/eventnative/safego"
	enstorages "github.com/jitsucom/eventnative/storages"
	"github.com/spf13/viper"
	"os"
	"os/signal"
	"runtime/debug"
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

	safego.GlobalRecoverHandler = func(value interface{}) {
		logging.Error("panic")
		logging.Error(value)
		logging.Error(string(debug.Stack()))
		notifications.SystemErrorf("Panic:\n%s\n%s", value, string(debug.Stack()))
	}

	//notifications
	slackNotificationsWebHook := viper.GetString("notifications.slack.url")
	if slackNotificationsWebHook != "" {
		notifications.Init("EN-helper", slackNotificationsWebHook, appconfig.Instance.ServerName, logging.Errorf)
	}

	//statistics postgres
	var pgDestinationConfig *enstorages.DestinationConfig
	if viper.IsSet("destinations.statistics.postgres") {
		pgDestinationConfig = &enstorages.DestinationConfig{}
		if err := viper.UnmarshalKey("destinations.statistics.postgres", pgDestinationConfig); err != nil {
			logging.Fatal("Error unmarshalling statistics postgres config:", err)
		}
		if err := pgDestinationConfig.DataSource.Validate(); err != nil {
			logging.Fatal("Error validation statistics postgres config:", err)
		}
	}

	//default s3
	s3Config := &enadapters.S3Config{}
	if err := viper.UnmarshalKey("destinations.hosted.s3", s3Config); err != nil {
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
	logging.Infof("Static files serving path: [%s]", staticFilesPath)

	enConfig := &eventnative.Config{}
	err = viper.UnmarshalKey("eventnative", enConfig)
	if err != nil {
		logging.Fatalf("Failed to parse eventnative config: %v", err)
	}
	err = enConfig.Validate()
	if err != nil {
		logging.Fatal("Failed to validate eventnative config: %v", err)
	}

	//statistics prometheus
	var prometheusConfig *statistics.PrometheusConfig
	if viper.IsSet("destinations.statistics.prometheus") {
		prometheusConfig = &statistics.PrometheusConfig{}
		if err := viper.UnmarshalKey("destinations.statistics.prometheus", prometheusConfig); err != nil {
			logging.Fatal("Error unmarshalling statistics prometheus config:", err)
		}
		if err := prometheusConfig.Validate(); err != nil {
			logging.Fatal("Error validation statistics prometheus config:", err)
		}
	}

	statisticsStorage, err := statistics.NewStorage(pgDestinationConfig, prometheusConfig, viper.GetStringMapStringSlice("old_keys"))
	if err != nil {
		logging.Fatal("Error initializing statistics storage:", err)
	}
	appconfig.Instance.ScheduleClosing(statisticsStorage)

	sshClient, err := ssh.NewSshClient(enConfig.SSL.SSH.PrivateKeyPath, enConfig.SSL.SSH.User)
	if err != nil {
		logging.Fatal("Failed to create SSH client, %s", err)
	}

	customDomainProcessor, err := ssl.NewCertificateService(sshClient, enConfig.SSL.Hosts, firebaseStorage, enConfig.SSL.ServerConfigTemplate, enConfig.SSL.NginxConfigPath, enConfig.SSL.AcmeChallengePath)

	sslUpdateExecutor := ssl.NewSSLUpdateExecutor(customDomainProcessor, enConfig.SSL.Hosts, enConfig.SSL.SSH.User, enConfig.SSL.SSH.PrivateKeyPath, enConfig.CName, enConfig.SSL.CertificatePath, enConfig.SSL.PKPath, enConfig.SSL.AcmeChallengePath)

	//updatePeriodMin := viper.GetUint("eventnative.ssl.period")
	//if updatePeriodMin < 1 {
	//	logging.Fatal("[eventnative.ssl.period] must be positive > 1")
	//}
	// using cron job now to avoid multiple servers simultaneous execution
	// sslUpdateExecutor.Schedule(time.Duration(updatePeriodMin) * time.Minute)

	enService := eventnative.NewService(enConfig.BaseUrl, enConfig.AdminToken)
	appconfig.Instance.ScheduleClosing(enService)

	router := SetupRouter(staticFilesPath, enService, firebaseStorage, authService, s3Config, pgDestinationConfig, statisticsStorage, sslUpdateExecutor)
	notifications.ServerStart()
	logging.Info("Started server: " + appconfig.Instance.Authority)
	server := &http.Server{
		Addr:              appconfig.Instance.Authority,
		Handler:           middleware.Cors(router, viper.GetString("server.domain")),
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
		logging.Infof("Reading config from %s", configFilePath)
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

func SetupRouter(staticContentDirectory string, enService *eventnative.Service,
	storage *storages.Firebase, authService *authorization.Service, defaultS3 *enadapters.S3Config,
	statisticsPostgres *enstorages.DestinationConfig, statisticsStorage statistics.Storage,
	sslUpdateExecutor *ssl.UpdateExecutor) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	//TODO when https://github.com/gin-gonic will have a new version (https://github.com/gin-gonic/gin/pull/2322)
	/*router.Use(gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
	    c.JSON(http.StatusInternalServerError, `{"err":"System error on %s server"}`
	}))*/

	router.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	serverToken := viper.GetString("server.auth")

	statisticsHandler := handlers.NewStatisticsHandler(statisticsStorage)
	apiKeysHandler := handlers.NewApiKeysHandler(storage)

	apiV1 := router.Group("/api/v1")
	{
		apiV1.POST("/database", middleware.ClientAuth(handlers.NewDatabaseHandler(storage).PostHandler, authService))
		apiV1.POST("/apikeys/default", middleware.ClientAuth(apiKeysHandler.CreateDefaultApiKeyHandler, authService))

		apiV1.GET("/apikeys", middleware.ServerAuth(middleware.IfModifiedSince(apiKeysHandler.GetHandler, storage.GetApiKeysLastUpdated), serverToken))
		apiV1.GET("/statistics", middleware.ClientAuth(statisticsHandler.GetHandler, authService))

		configurationHandler, err := handlers.NewConfigurationHandler(storage, defaultS3)
		if err != nil {
			logging.Fatal("Failed to create configuration handler", err)
		}
		apiV1.GET("/eventnative/configuration", middleware.ClientAuth(configurationHandler.Handler, authService))

		apiV1.POST("/ssl", middleware.ClientAuth(handlers.NewCustomDomainHandler(sslUpdateExecutor).PerProjectHandler, authService))
		apiV1.POST("/ssl/all", middleware.ServerAuth(handlers.NewCustomDomainHandler(sslUpdateExecutor).AllHandler, serverToken))

		destinationsHandler := handlers.NewDestinationsHandler(storage, defaultS3, statisticsPostgres, enService)
		destinationsRoute := apiV1.Group("/destinations")
		destinationsRoute.GET("/", middleware.ServerAuth(middleware.IfModifiedSince(destinationsHandler.GetHandler, storage.GetDestinationsLastUpdated), serverToken))
		destinationsRoute.POST("/test", middleware.ClientAuth(destinationsHandler.TestHandler, authService))

		eventsHandler := handlers.NewEventsHandler(storage, enService)
		apiV1.GET("/events", middleware.ClientAuth(eventsHandler.OldGetHandler, authService))
		apiV1.GET("/last_events", middleware.ClientAuth(eventsHandler.GetHandler, authService))

		apiV1.GET("/become", middleware.ClientAuth(handlers.NewBecomeUserHandler(authService).Handler, authService))
	}
	router.Use(static.Serve("/", static.LocalFile(staticContentDirectory, false)))
	return router
}
