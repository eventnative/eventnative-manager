package main

import (
	"flag"
	"fmt"
	"github.com/ksensehq/enhosted/appconfig"
	"github.com/spf13/viper"
	"log"
	"net/http"
	"strings"
)

func main() {
	configFilePath := flag.String("cfg", "", "config file path")
	readConfiguration(*configFilePath)
	appConfig := appconfig.Instance
	http.HandleFunc("/", HelloServer)
	log.Fatal(http.ListenAndServe(appConfig.Authority, nil))
}

func readConfiguration(configFilePath string) {
	flag.Parse()
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
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

func HelloServer(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, %s!\n", r.URL.Path[1:])
}
