package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/authorization"
	"github.com/ksensehq/enhosted/destinations"
	"github.com/ksensehq/enhosted/entities"
	"github.com/ksensehq/enhosted/random"
	"github.com/ksensehq/enhosted/storages"
	enadapters "github.com/ksensehq/eventnative/adapters"
	"github.com/ksensehq/eventnative/middleware"
	enstorages "github.com/ksensehq/eventnative/storages"
	"gopkg.in/yaml.v3"
	"net/http"
)

const configHeaderText = `Generated by https://app.eventnative.com
Documentation: https://docs.eventnative.dev

If executed out of our docker container and batch destinations are used, set up events logging
log:
	path: <path to event logs directory>`

type ConfigHandler struct {
	fb        *storages.Firebase
	defaultS3 *enadapters.S3Config
}

func NewConfigurationHandler(fb *storages.Firebase, s3 *enadapters.S3Config) (*ConfigHandler, error) {
	return &ConfigHandler{fb: fb, defaultS3: s3}, nil
}

type Server struct {
	Name    *yaml.Node         `json:"name" yaml:"name,omitempty"`
	ApiKeys []*entities.ApiKey `json:"auth" yaml:"auth,omitempty"`
}

type Config struct {
	Server       Server                                   `json:"server" yaml:"server,omitempty"`
	Destinations map[string]*enstorages.DestinationConfig `json:"destinations" yaml:"destinations,omitempty"`
}

func (ch *ConfigHandler) Handler(c *gin.Context) {
	projectId := c.Query("project_id")
	if projectId == "" {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "[project_id] query parameter absents"})
		return
	}
	if !authorization.HasAccessToProject(c, projectId) {
		c.JSON(http.StatusUnauthorized, middleware.ErrorResponse{Message: "You are not authorized to request data for project " + projectId})
		return
	}

	keys, err := ch.fb.GetApiKeysByProjectId(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Failed to get API keys"})
		return
	}

	projectDestinations, err := ch.fb.GetDestinationsByProjectId(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Failed to get Destinations"})
		return
	}
	mappedDestinations := make(map[string]*enstorages.DestinationConfig)
	for _, destination := range projectDestinations {
		id := destination.Id
		config, err := destinations.MapConfig(id, destination, ch.defaultS3)

		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Failed to build destinations response"})
			return
		}
		mappedDestinations[id] = config
	}

	// building yaml response
	server := Server{ApiKeys: keys, Name: &yaml.Node{Kind: yaml.ScalarNode, Value: random.String(5), LineComment: "rename server if another name is desired"}}
	config := Config{Server: server, Destinations: mappedDestinations}
	marshal, err := yaml.Marshal(&config)
	configYaml := yaml.Node{}
	if err = yaml.Unmarshal(marshal, &configYaml); err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Failed to deserialize result configuration"})
		return
	}
	configYaml.HeadComment = configHeaderText

	marshal, err = yaml.Marshal(&configYaml)
	c.Header("Content-Type", "application/yaml")
	if _, err = c.Writer.Write(marshal); err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Failed write response"})
	}
}
