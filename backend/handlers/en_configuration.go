package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/entities"
	"github.com/ksensehq/enhosted/storages"
	"github.com/ksensehq/eventnative/middleware"
	"net/http"
)

type ConfigHandler struct {
	fb *storages.Firebase
}

func NewConfigurationHandler(fb *storages.Firebase) *ConfigHandler {
	return &ConfigHandler{fb: fb}
}

type Response struct {
	Server       Server                  `yaml:"server"`
	Destinations []*entities.Destination `yaml:"destinations"`
}

type Server struct {
	ApiKeys []*entities.ApiKey `yaml:"auth"`
}

func (eh *ConfigHandler) Handler(c *gin.Context) {
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
	keys, err := eh.fb.GetApiKeysByProjectId(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Filed to get API keys"})
		return
	}
	destinations, err := eh.fb.GetDestinationsByProjectId(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: "Filed to get Destinations"})
		return
	}
	resp := Response{Server: Server{ApiKeys: keys}, Destinations: destinations}
	c.YAML(http.StatusOK, &resp)
}
