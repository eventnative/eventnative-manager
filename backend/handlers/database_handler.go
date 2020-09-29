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

func NewDatabaseHandler(provider *db_provider.DBProvider, authenticator *auth.Authenticator) *DatabaseHandler {
	return &DatabaseHandler{*provider, *authenticator}
}

func (eh *DatabaseHandler) Handler(c *gin.Context) {
	token := c.GetHeader("X-Client-Auth")
	uid, err := eh.authenticator.Authenticate(c, token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, err)
	}
	response, err := eh.dbProvider.CreateDatabase(uid)
	if err != nil {
		c.JSON(http.StatusBadRequest, err)
	}
	c.JSON(http.StatusOK, response)
}
