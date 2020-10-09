package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/authorization"
	"github.com/ksensehq/eventnative/logging"
	"net/http"
)

const ProjectIdKey = "_project_id"

func ClientAuth(main gin.HandlerFunc, service *authorization.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("X-Client-Auth")
		projectId, err := service.Authenticate(c, token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, WebErrorWrapper{Error: err, Message: "You are not authorized"})
			return
		}

		if projectId == "" {
			logging.Errorf("System error: project id is empty in token: %s", token)
			c.JSON(http.StatusUnauthorized, WebErrorWrapper{Message: "Authorization error"})
			return
		}

		c.Set(ProjectIdKey, projectId)

		main(c)
	}
}