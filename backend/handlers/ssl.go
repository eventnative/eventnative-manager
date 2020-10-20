package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/ssl"
	"github.com/ksensehq/eventnative/middleware"
	"net/http"
)

type CustomDomainHandler struct {
	updateExecutor *ssl.UpdateExecutor
}

func NewCustomDomainHandler(executor *ssl.UpdateExecutor) *CustomDomainHandler {
	return &CustomDomainHandler{executor}
}

func (h *CustomDomainHandler) Handler(c *gin.Context) {
	go h.updateExecutor.Run()
	c.JSON(http.StatusOK, middleware.OkResponse{Status: "scheduled ssl update"})
}
