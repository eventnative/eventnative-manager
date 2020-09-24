package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/database"
	"net/http"
)

type DatabaseHandler struct {
	dbProvider database.DBProvider
}

func NewDatabaseHandler(provider database.DBProvider) *DatabaseHandler {
	return &DatabaseHandler{provider}
}

func (eh *DatabaseHandler) Handler(c *gin.Context) {
	token := c.Request.URL.Query()["token"]
	//iface, _ := c.Get("token")
	//token := iface.(string)

	response := eh.dbProvider.CreateDatabase(token[0])
	c.JSON(http.StatusOK, response)
}
