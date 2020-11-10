module github.com/jitsucom/enhosted

go 1.14

require (
	cloud.google.com/go/firestore v1.3.0
	firebase.google.com/go/v4 v4.1.0
	github.com/bramvdbogaerde/go-scp v0.0.0-20200820121624-ded9ee94aef5
	github.com/gin-contrib/static v0.0.0-20200916080430-d45d9a37d28e
	github.com/gin-gonic/gin v1.6.3
	github.com/go-acme/lego v2.7.2+incompatible
	github.com/hashicorp/go-multierror v1.1.0
	github.com/jitsucom/eventnative v1.17.1
	github.com/lib/pq v1.8.0
	github.com/prometheus/common v0.15.0
	github.com/spf13/viper v1.7.1
	golang.org/x/crypto v0.0.0-20201016220609-9e8e0b390897
	google.golang.org/api v0.29.0
	google.golang.org/grpc v1.30.0
	gopkg.in/square/go-jose.v2 v2.5.1 // indirect
	gopkg.in/yaml.v3 v3.0.0-20200615113413-eeeca48fe776
)

replace google.golang.org/api v0.17.0 => google.golang.org/api v0.15.1

replace google.golang.org/grpc v1.27.0 => google.golang.org/grpc v1.26.0
