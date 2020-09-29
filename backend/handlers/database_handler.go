package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/db_provider"
	"net/http"
)

type DatabaseHandler struct {
	dbProvider db_provider.DBProvider
}

func NewDatabaseHandler(provider db_provider.DBProvider) *DatabaseHandler {
	return &DatabaseHandler{provider}
}

func (eh *DatabaseHandler) Handler(c *gin.Context) {
	token := c.Request.URL.Query()["token"]
	//iface, _ := c.Get("token")
	//token := iface.(string)

	response, err := eh.dbProvider.CreateDatabase(token[0])
	if err != nil {
		c.JSON(http.StatusBadRequest, err)
	}
	c.JSON(http.StatusOK, response)
}
