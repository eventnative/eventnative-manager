# Go parameters
export PATH := $(shell go env GOPATH)/bin:$(PATH)
export APPLICATION=enhosted

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
	cp dist/* ./build/dist/web/

backend:
	cd ./backend; go mod tidy; $(TARGET_ENV) go build -o ../$(APPLICATION)

frontend:
	cd ./frontend; npm install; yarn build --output-path ../dist


clean:
	go clean
	rm -f $(APPLICATION)
	rm -rf dist
	rm -rf ./frontend/node_modules
	rm -rf ./build
