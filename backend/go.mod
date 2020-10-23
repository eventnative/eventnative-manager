module github.com/ksensehq/enhosted

go 1.14

require (
	cloud.google.com/go/firestore v1.1.1
	firebase.google.com/go/v4 v4.0.0
	github.com/bramvdbogaerde/go-scp v0.0.0-20200820121624-ded9ee94aef5
	github.com/cenkalti/backoff v2.2.1+incompatible // indirect
	github.com/gin-contrib/static v0.0.0-20200916080430-d45d9a37d28e
	github.com/gin-gonic/gin v1.6.3
	github.com/go-acme/lego v2.7.2+incompatible
	github.com/hashicorp/go-multierror v1.1.0
	github.com/ksensehq/eventnative v1.15.0
	github.com/lib/pq v1.8.0
	github.com/prometheus/common v0.4.0
	github.com/spf13/viper v1.7.1
	golang.org/x/crypto v0.0.0-20200622213623-75b288015ac9
	google.golang.org/api v0.17.0
	google.golang.org/grpc v1.27.0
	gopkg.in/square/go-jose.v2 v2.5.1 // indirect
	gopkg.in/yaml.v3 v3.0.0-20200313102051-9f266ea9e77c
)

replace google.golang.org/api v0.17.0 => google.golang.org/api v0.15.1

replace google.golang.org/grpc v1.27.0 => google.golang.org/grpc v1.26.0
