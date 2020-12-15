# Go parameters
export PATH := $(shell go env GOPATH)/bin:$(PATH)
export APPLICATION=enhosted
export ROUTING_TYPE=url

ifdef linux
  export TARGET_ENV=GOOS=linux GOARCH=amd64
else
    export TARGET_ENV=
endif

.PHONY: all test clean backend frontend

all: clean assemble

assemble: backend frontend
	mkdir -p ./build/dist/web
	cp enhosted ./build/dist/
	cp frontend/build/* ./build/dist/web/

backend:
	cd ./backend; mkdir -p generated/jitsu; protoc -I=../protocol/ --go_out=./generated/jitsu/ ../protocol/objects.proto; go mod tidy; $(TARGET_ENV) go build -o ../$(APPLICATION)

frontend:
	cd ./frontend; yarn install; yarn build

clean: clean-backend clean-frontend

clean-backend:
	go clean
	rm -f $(APPLICATION)
	rm -rf dist
	rm -rf ./build
	rm -rf ./backend/generated

clean-frontend:
	rm -rf ./frontend/build
	
