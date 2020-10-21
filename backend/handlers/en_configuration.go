package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/destinations"
	"github.com/ksensehq/enhosted/entities"
	"github.com/ksensehq/enhosted/storages"
	enadapters "github.com/ksensehq/eventnative/adapters"
	"github.com/ksensehq/eventnative/middleware"
	enstorages "github.com/ksensehq/eventnative/storages"
	"net/http"
	"text/template"
)

type ConfigHandler struct {
	fb             *storages.Firebase
	configTemplate *template.Template
	defaultS3      *enadapters.S3Config
}

func NewConfigurationHandler(fb *storages.Firebase, s3 *enadapters.S3Config) (*ConfigHandler, error) {
	configurationTemplate, err := template.ParseFiles("/Users/arr/IdeaProjects/eventnative-hosted/backend/templates/config_template.yml")
	if err != nil {
		return nil, err
	}
	return &ConfigHandler{fb: fb, configTemplate: configurationTemplate, defaultS3: s3}, err
}

type Response struct {
	Server       Server                                   `json:"server" yaml:"server"`
	Destinations map[string]*enstorages.DestinationConfig `json:"destinations" yaml:"destinations"`
}

type Server struct {
	ApiKeys []*entities.ApiKey `json:"auth" yaml:"auth"`
}

type ResponseYaml struct {
	ApiKeys string
}

func (ch *ConfigHandler) Handler(c *gin.Context) {
	projectId := c.Query("project_id")
	if projectId == "" {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "[project_id] query parameter absents"})
		return
	}
	userProjectId, exists := c.Get("_project_id")
	if !exists || userProjectId != projectId {
		c.JSON(http.StatusUnauthorized, middleware.ErrorResponse{Message: "You are not authorized to request data for project " + projectId})
		return
	}
	keys, err := ch.fb.GetApiKeysByProjectId(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Filed to get API keys"})
		return
	}
	projectDestinations, err := ch.fb.GetDestinationsByProjectId(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Filed to get Destinations"})
		return
	}
	respDestinations := make(map[string]*enstorages.DestinationConfig)
	for _, destination := range projectDestinations {
		id := projectId + "." + destination.Id
		config, err := destinations.MapConfig(id, destination, ch.defaultS3)
		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Filed to build destinations response"})
			return
		}
		respDestinations[id] = config

	}
	resp := Response{Server: Server{ApiKeys: keys}, Destinations: respDestinations}
	c.YAML(http.StatusOK, resp)
}
