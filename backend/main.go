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
	"github.com/ksensehq/enhosted/ssh"
	"github.com/ksensehq/enhosted/ssl"
	"github.com/ksensehq/enhosted/statistics"
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
	eventnativeBaseUrl := viper.GetString("eventnative.base_url")
	if eventnativeBaseUrl == "" {
		logging.Fatal("Failed to get eventnative URL")
	}
	eventnativeAdminToken := viper.GetString("eventnative.admin_token")
	if eventnativeAdminToken == "" {
		logging.Fatal("eventnative.admin_token is not set")
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

	sshUser := viper.GetString("eventnative.ssl.ssh.user")
	if sshUser == "" {
		logging.Fatal("[eventnative.ssl.ssh.user] is not set")
	}
	privateKeyPath := viper.GetString("eventnative.ssl.ssh.privateKeyPath")
	if privateKeyPath == "" {
		logging.Fatal("[eventnative.ssl.ssh.privateKeyPath] is not set")
	}
	enHosts := viper.GetStringSlice("eventnative.ssl.hosts")
	if enHosts == nil || len(enHosts) == 0 {
		logging.Fatal("[eventnative.ssl.hosts] must not be empty")
	}
	sshClient, err := ssh.NewSshClient(privateKeyPath, sshUser)
	if err != nil {
		logging.Fatal("Failed to create SSH client, %s", err)
	}
	nginxServerConfigTemplatePath := viper.GetString("eventnative.ssl.server_config_template")
	sslNginxPath := viper.GetString("eventnative.ssl.nginx_conf_path")
	if sslNginxPath == "" {
		logging.Fatal("[eventnative.ssl.nginx_conf_path] is a required parameter")
	}
	acmeChallengePath := viper.GetString("eventnative.ssl.acme_challenge_path")
	if acmeChallengePath == "" {
		logging.Fatal("[eventnative.ssl.acme_challenge_path] is a required parameter")
	}
	customDomainProcessor, err := ssl.NewCertificateService(sshClient, enHosts, firebaseStorage, nginxServerConfigTemplatePath, sslNginxPath, acmeChallengePath)
	if err != nil {
		logging.Fatal("Failed to create customDomainProcessor " + err.Error())
	}
	enCName := viper.GetString("eventnative.cname")
	if enCName == "" {
		logging.Fatal("[eventnative.cname] is a required parameter")
	}
	certPath := viper.GetString("eventnative.ssl.cert_path")
	if certPath == "" {
		logging.Fatal("[eventnative.ssl.cert_path] is a required parameter")
	}
	pkPath := viper.GetString("eventnative.ssl.pk_path")
	if pkPath == "" {
		logging.Fatal("[eventnative.ssl.pk_path] is a required parameter")
	}
	sslUpdateExecutor := ssl.NewSSLUpdateExecutor(customDomainProcessor, enHosts, sshUser, privateKeyPath, enCName, certPath, pkPath, acmeChallengePath)
	updatePeriodMin := viper.GetUint("eventnative.ssl.period")
	if updatePeriodMin < 1 {
		logging.Fatal("[eventnative.ssl.period] must be positive > 1")
	}
	sslUpdateExecutor.Schedule(time.Duration(updatePeriodMin) * time.Minute)

	router := SetupRouter(staticFilesPath, eventnativeBaseUrl, eventnativeAdminToken, firebaseStorage, authService, s3Config, pgDestinationConfig, statisticsStorage, sslUpdateExecutor)
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

func SetupRouter(staticContentDirectory string, eventnativeBaseUrl string, eventnativeAdminToken string,
	storage *storages.Firebase, authService *authorization.Service, defaultS3 *enadapters.S3Config,
	statisticsPostgres *enstorages.DestinationConfig, statisticsStorage statistics.Storage,
	sslUpdateExecutor *ssl.UpdateExecutor) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()

	router.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	serverToken := viper.GetString("server.auth")

	statisticsHandler := handlers.NewStatisticsHandler(statisticsStorage)

	apiV1 := router.Group("/api/v1")
	{
		apiV1.POST("/database", middleware.ClientAuth(handlers.NewDatabaseHandler(storage).PostHandler, authService))
		apiV1.GET("/apikeys", middleware.ServerAuth(middleware.IfModifiedSince(handlers.NewApiKeysHandler(storage).GetHandler, storage.GetApiKeysLastUpdated), serverToken))
		apiV1.GET("/statistics", middleware.ClientAuth(statisticsHandler.GetHandler, authService))

		apiV1.GET("/eventnative/configuration", middleware.ClientAuth(handlers.NewConfigurationHandler(storage).Handler, authService))

		apiV1.POST("/ssl", middleware.ClientAuth(handlers.NewCustomDomainHandler(sslUpdateExecutor).Handler, authService))

		destinationsHandler := handlers.NewDestinationsHandler(storage, defaultS3, statisticsPostgres, eventnativeBaseUrl, eventnativeAdminToken)
		destinationsRoute := apiV1.Group("/destinations")
		destinationsRoute.GET("/", middleware.ServerAuth(middleware.IfModifiedSince(destinationsHandler.GetHandler, storage.GetDestinationsLastUpdated), serverToken))
		destinationsRoute.POST("/test", middleware.ClientAuth(destinationsHandler.TestHandler, authService))
	}
	router.Use(static.Serve("/", static.LocalFile(staticContentDirectory, false)))
	return router
}
