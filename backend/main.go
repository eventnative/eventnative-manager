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
	"github.com/ksensehq/eventnative/logging"
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
	eventnativeBaseUrl := viper.GetString("eventnative.base_url")
	if eventnativeBaseUrl == "" {
		logging.Fatal("Failed to get eventnative URL")
	}
	eventnativeAdminToken := viper.GetString("eventnative.admin_token")
	if eventnativeAdminToken == "" {
		logging.Fatal("eventnative.admin_token is not set")
	}
	router := SetupRouter(staticFilesPath, eventnativeBaseUrl, eventnativeAdminToken, firebaseStorage, authService)
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

func SetupRouter(staticContentDirectory string, eventnativeBaseUrl string, eventnativeAdminToken string, storage *storages.Firebase, authService *authorization.Service) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()

	router.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	apiV1 := router.Group("/api/v1")
	{
		handler := handlers.NewDatabaseHandler(storage, eventnativeBaseUrl, eventnativeAdminToken)
		apiV1.POST("/database", middleware.ClientAuth(handler.PostHandler, authService))
		apiV1.POST("/test_connection", middleware.ClientAuth(handler.TestHandler, authService))
	}
	router.Use(static.Serve("/", static.LocalFile(staticContentDirectory, false)))
	return router
}
