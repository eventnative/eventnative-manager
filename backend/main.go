package main

import (
	"flag"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/appconfig"
	"github.com/ksensehq/enhosted/auth"
	"github.com/ksensehq/enhosted/db_provider"
	"github.com/ksensehq/enhosted/handlers"
	"github.com/spf13/viper"
	"log"
	"net/http"
	"strings"
	"time"
)

func main() {
	configFilePath := flag.String("cfg", "", "config file path")
	flag.Parse()
	ReadConfiguration(*configFilePath)
	staticFilesPath := viper.GetString("server.static_files_dir")
	log.Printf("Static files serving path: [%s]\n", staticFilesPath)
	router := SetupRouter(staticFilesPath)
	server := &http.Server{
		Addr:              appconfig.Instance.Authority,
		Handler:           Cors(router),
		ReadTimeout:       time.Second * 60,
		ReadHeaderTimeout: time.Second * 60,
		IdleTimeout:       time.Second * 65,
	}
	log.Fatal(server.ListenAndServe())
}

func Cors(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Access-Control-Max-Age", "86400")
		w.Header().Add("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
		w.Header().Add("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Host, X-Client-Auth")
		w.Header().Add("Access-Control-Allow-Credentials", "true")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		h.ServeHTTP(w, r)
	})
}

func ReadConfiguration(configFilePath string) {
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	if configFilePath != "" {
		log.Printf("Reading config from %s\n", configFilePath)
	}
	viper.SetConfigFile(configFilePath)
	if err := viper.ReadInConfig(); err != nil {
		if viper.ConfigFileUsed() != "" {
			log.Fatalf("Could not read file %s", viper.ConfigFileUsed())
		}
	}
	if err := appconfig.Init(); err != nil {
		log.Fatal(err)
	}
}

func SetupRouter(staticContentDirectory string) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	dbProviderConfig := viper.Sub("db_provider")
	if dbProviderConfig == nil {
		log.Fatal("db_provider is not configured")
	}
	provider, err := db_provider.NewDatabaseProvider(dbProviderConfig)
	if err != nil {
		log.Fatalf("Failed to create db_provider: %s", err)
	}
	authenticator, err := auth.NewAuthenticator(viper.Sub("auth"))
	if err != nil {
		log.Fatalf("Failed to configure auth service: %s", err)
	}
	databaseHandler := handlers.NewDatabaseHandler(&provider, &authenticator)
	postDbHandler := databaseHandler.PostHandler
	getDbHandler := databaseHandler.GetHandler
	apiV1 := router.Group("/api/v1")
	{
		apiV1.GET("/database", getDbHandler)
		apiV1.POST("/database", postDbHandler)
		apiV1.GET("/", func(c *gin.Context) {
			c.String(http.StatusOK, "This is %s. Hello, user!\n", appconfig.Instance.ServerName)
		})
	}
	router.Use(static.Serve("/", static.LocalFile(staticContentDirectory, false)))
	return router
}
