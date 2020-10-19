package handlers

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

type ConfigHandler struct {
}

func NewConfigurationHandler() *ConfigHandler {
	return &ConfigHandler{}
}

type StubResponse struct {
	Destinations map[string]DestinationPostgres `yaml:"destinations"`
}

type DestinationPostgres struct {
	Type string     `yaml:"type"`
	Mode string     `yaml:"mode"`
	DS   Datasource `yaml:"datasource"`
}

type Datasource struct {
	Schema   string `yaml:"schema"`
	Host     string `yaml:"host"`
	Db       string `yaml:"db"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

func (eh *ConfigHandler) Handler(c *gin.Context) {
	stub := StubResponse{}
	ds := Datasource{Schema: "statistics", Host: "ec2-3-208-91-190.compute-1.amazonaws.com", Db: "d407fn369vu7fr", Username: "u8rug136k5pa6o", Password: "p492771b0cef7c52f715d9d7f09f114f60d0272d9361124b2b56b19d861f0e6e4"}
	dp := DestinationPostgres{DS: ds, Type: "postgres", Mode: "stream"}
	m := make(map[string]DestinationPostgres)
	m["test"] = dp
	stub.Destinations = m
	c.YAML(http.StatusOK, stub)
}
