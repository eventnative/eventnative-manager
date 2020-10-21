package handlers

import (
	"github.com/gin-gonic/gin"
	middleware2 "github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/enhosted/ssl"
	"github.com/ksensehq/eventnative/middleware"
	"net/http"
	"strings"
)

type CustomDomainHandler struct {
	updateExecutor *ssl.UpdateExecutor
}

func NewCustomDomainHandler(executor *ssl.UpdateExecutor) *CustomDomainHandler {
	return &CustomDomainHandler{executor}
}

func (h *CustomDomainHandler) Handler(c *gin.Context) {
	projectId := c.Query("projectId")
	async := false
	if strings.ToLower(c.Query("async")) == "true" {
		async = true
	}
	if projectId != "" {
		if async {
			go h.updateExecutor.RunForProject(projectId)
			c.JSON(http.StatusOK, middleware2.OkResponse{Status: "scheduled ssl update"})
			return
		} else {
			err := h.updateExecutor.RunForProject(projectId)
			if err != nil {
				c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: err.Error()})
				return
			}
			c.JSON(http.StatusOK, middleware2.OkResponse{Status: "ok"})
		}
	} else {
		if async {
			go h.updateExecutor.Run()
			c.JSON(http.StatusOK, middleware2.OkResponse{Status: "scheduled ssl update"})
			return
		} else {
			err := h.updateExecutor.Run()
			if err != nil {
				c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: err.Error()})
				return
			}
			c.JSON(http.StatusOK, middleware2.OkResponse{Status: "ok"})
		}
	}

}
