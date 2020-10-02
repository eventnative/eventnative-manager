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

func NewDatabaseHandler(provider *db_provider.DBProvider, authenticator *auth.Authenticator) *DatabaseHandler {
	return &DatabaseHandler{*provider, *authenticator}
}

func (eh *DatabaseHandler) PostHandler(c *gin.Context) {
	uid, err := eh.resolveUserId(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, WebErrorWrapper{Error: err, Message: "You are not authorized to create a database"})
		return
	}
	response, err := eh.dbProvider.CreateDatabase(uid)
	if err != nil {
		c.JSON(http.StatusBadRequest, WebErrorWrapper{Error: err, Message: "Failed to create a database for user " + uid})
	}
	c.JSON(http.StatusOK, response)
}

func (eh *DatabaseHandler) GetHandler(c *gin.Context) {
	uid, err := eh.resolveUserId(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, WebErrorWrapper{Error: err, Message: "You are not authorized, provide appropriate token"})
		return
	}
	credentials, err := eh.dbProvider.GetDatabase(uid)
	if err != nil {
		c.JSON(http.StatusBadRequest, WebErrorWrapper{Error: err, Message: "Failed to get demo database for user " + uid})
		return
	}
	if credentials == nil {
		c.JSON(http.StatusNotFound, WebErrorWrapper{Message: "Demo database does not exist for user " + uid, Error: err})
	}
	c.JSON(http.StatusOK, credentials)
}

func (eh *DatabaseHandler) resolveUserId(c *gin.Context) (string, error) {
	token := c.GetHeader("X-Client-Auth")
	uid, err := eh.authenticator.Authenticate(c, token)
	return uid, err
}
