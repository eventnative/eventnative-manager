package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/auth"
	"github.com/ksensehq/enhosted/db_provider"
	"net/http"
)

type DatabaseHandler struct {
	dbProvider    db_provider.DBProvider
	authenticator auth.Authenticator
}

type WebErrorWrapper struct {
	Message string `json:"message"`
	Error   error  `json:"error"`
}

type DbCreationRequestBody struct {
	ProjectId string `json:"projectId"`
}

func NewDatabaseHandler(provider *db_provider.DBProvider, authenticator *auth.Authenticator) *DatabaseHandler {
	return &DatabaseHandler{*provider, *authenticator}
}

func (eh *DatabaseHandler) PostHandler(c *gin.Context) {
	body := DbCreationRequestBody{}
	if err := c.BindJSON(&body); err != nil {
		c.Writer.WriteHeader(http.StatusBadRequest)
		return
	}
	projectId := body.ProjectId
	userProjectId, err := eh.resolveProjectId(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, WebErrorWrapper{Error: err, Message: "You are not authorized to create a database"})
		return
	}
	if userProjectId != projectId {
		c.JSON(http.StatusUnauthorized, WebErrorWrapper{Message: "User does not have access to project " + projectId})
		return
	}
	response, err := eh.dbProvider.CreateDatabase(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, WebErrorWrapper{Error: err, Message: "Failed to create a database for project " + projectId})
	}
	c.JSON(http.StatusOK, response)
}

func (eh *DatabaseHandler) resolveProjectId(c *gin.Context) (string, error) {
	token := c.GetHeader("X-Client-Auth")
	projectId, err := eh.authenticator.Authenticate(c, token)
	return projectId, err
}
