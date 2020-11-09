package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/jitsucom/enhosted/eventnative"
	"github.com/jitsucom/enhosted/storages"
	enevents "github.com/jitsucom/eventnative/events"
	enhandlers "github.com/jitsucom/eventnative/handlers"
	"github.com/jitsucom/eventnative/logging"
	enmiddleware "github.com/jitsucom/eventnative/middleware"
	"net/http"
	"strconv"
	"time"
)

type EventsHandler struct {
	storage   *storages.Firebase
	enService *eventnative.Service
}

func NewEventsHandler(storage *storages.Firebase, enService *eventnative.Service) *EventsHandler {
	return &EventsHandler{
		storage:   storage,
		enService: enService,
	}
}

func (eh *EventsHandler) GetHandler(c *gin.Context) {
	start := time.Now()
	limit := 100
	limitStr := c.Query("limit")
	if limitStr != "" {
		limitInt, err := strconv.Atoi(limitStr)
		if err != nil {
			logging.Errorf("Error parsing [limit] query parameter")
		} else {
			limit = limitInt
		}
	}

	projectId := c.Query("project_id")
	if projectId == "" {
		c.JSON(http.StatusBadRequest, enmiddleware.ErrorResponse{Message: "[project_id] is a required query parameter"})
		return
	}

	userProjectId := extractProjectId(c)
	if userProjectId == "" {
		logging.Error(systemErrProjectId)
		c.JSON(http.StatusUnauthorized, enmiddleware.ErrorResponse{Error: systemErrProjectId, Message: "Authorization error"})
		return
	}

	if userProjectId != projectId {
		c.JSON(http.StatusUnauthorized, enmiddleware.ErrorResponse{Message: "User does not have access to project " + projectId})
		return
	}

	apiKeysObjects, err := eh.storage.GetApiKeysByProjectId(projectId)
	if err != nil {
		logging.Errorf("Error getting api keys for [%s] project. All destinations will be skipped: %v", projectId, err)
		c.JSON(http.StatusBadRequest, enmiddleware.ErrorResponse{Message: "Error getting api keys for project " + projectId})
		return
	}
	if len(apiKeysObjects) == 0 {
		c.JSON(http.StatusOK, enhandlers.CachedEventsResponse{Events: []enevents.Fact{}})
		return
	}

	var apiKeys []string
	for _, keyObject := range apiKeysObjects {
		apiKeys = append(apiKeys, keyObject.ServerSecret, keyObject.ClientSecret)
	}

	events, err := eh.enService.GetEvents(apiKeys, limit)
	if err != nil {
		logging.Error(err)
		c.JSON(http.StatusInternalServerError, enmiddleware.ErrorResponse{Message: "Events err: " + err.Error()})
		return
	}

	logging.Infof("Events response in [%.2f] seconds", time.Now().Sub(start).Seconds())
	c.JSON(http.StatusOK, enhandlers.CachedEventsResponse{Events: events})
}
