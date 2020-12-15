# EN backend helper
Helper is a layer between hosted version data storage and Eventnative (core). 
Also, Helper solves some problems like SSL certificates on Eventnative backend to allow clients use custom domains configured at hosted frontend. 

## Prerequisites
To build backend helper, you need to install plugins for code generation from protobuf:
```shell script
go get github.com/golang/protobuf/proto
go install google.golang.org/protobuf/cmd/protoc-gen-go
```
Also, check you have _GO\_PATH_ configured and that _PATH_ variable contains _GO\_PATH_ (required for Golang protobuf plugin) 
