package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/ssl"
	"github.com/ksensehq/eventnative/middleware"
	"net"
	"net/http"
	"strings"
)

type CustomDomainHandler struct {
	processor *ssl.CustomDomainProcessor
}

func NewCustomDomainHandler(processor *ssl.CustomDomainProcessor) *CustomDomainHandler {
	return &CustomDomainHandler{processor: processor}
}

func (h *CustomDomainHandler) Handler(c *gin.Context) {
	domains, err := h.processor.LoadCustomDomains()
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	}
	validDomains := filterExistingCNames(domains)
	println(validDomains)
}

func filterExistingCNames(domains []string) []string {
	isNotDigit := func(c rune) bool { return c < '0' || c > '9' }
	resultDomains := make([]string, 0)
	for _, domain := range domains {
		onlyNumbers := strings.IndexFunc(domain, isNotDigit) == -1
		if !onlyNumbers {
			if _, err := net.LookupCNAME(domain); err == nil {
				resultDomains = append(resultDomains, domain)
			}
		}
	}
	return resultDomains
}
