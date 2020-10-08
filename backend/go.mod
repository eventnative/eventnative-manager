module github.com/ksensehq/enhosted

go 1.14

require (
	cloud.google.com/go/firestore v1.1.1
	firebase.google.com/go/v4 v4.0.0
	github.com/gin-contrib/static v0.0.0-20200916080430-d45d9a37d28e
	github.com/gin-gonic/gin v1.6.3
	github.com/hashicorp/go-multierror v1.1.0
	github.com/ksensehq/eventnative v1.8.0
	github.com/lib/pq v1.8.0
	github.com/spf13/viper v1.7.1
	google.golang.org/api v0.17.0
	google.golang.org/grpc v1.27.0
)

replace google.golang.org/api v0.17.0 => google.golang.org/api v0.15.1

replace google.golang.org/grpc v1.27.0 => google.golang.org/grpc v1.26.0
