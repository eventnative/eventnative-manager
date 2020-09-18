# Go parameters
export PATH := $(shell go env GOPATH)/bin:$(PATH)
export APPLICATION=enhosted

.PHONY: all test clean backend

all: clean assemble

assemble: backend
	mkdir -p ./build/dist/
	cp enhosted ./build/dist/

backend:
	cd ./backend; go build -o ../$(APPLICATION)

clean:
	go clean
	rm -f $(APPLICATION)
	rm -rf ./build
