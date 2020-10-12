package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/enhosted/storages"
	"github.com/ksensehq/eventnative/logging"
	enmiddleware "github.com/ksensehq/eventnative/middleware"
	"net/http"
)

var systemErrProjectId = fmt.Errorf("System error: %s wasn't found in context" + middleware.ProjectIdKey)

const jsonContentType = "application/json"

type DatabaseHandler struct {
	storage *storages.Firebase
}

type DbCreationRequestBody struct {
	ProjectId string `json:"projectId"`
}

func NewDatabaseHandler(storage *storages.Firebase) *DatabaseHandler {
	return &DatabaseHandler{storage: storage}
}

func (eh *DatabaseHandler) PostHandler(c *gin.Context) {
	body := DbCreationRequestBody{}
	if err := c.BindJSON(&body); err != nil {
		c.Writer.WriteHeader(http.StatusBadRequest)
		return
	}
	projectId := body.ProjectId
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

	database, err := eh.storage.CreateDatabase(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, enmiddleware.ErrorResponse{Error: err, Message: "Failed to create a database for project " + projectId + ": " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, database)
}

func extractProjectId(c *gin.Context) string {
	iface, ok := c.Get(middleware.ProjectIdKey)
	if !ok {
		return ""
	}
	return iface.(string)
}
