package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/ssh"
	"github.com/ksensehq/enhosted/ssl"
	"github.com/ksensehq/eventnative/middleware"
	"io/ioutil"
	"net"
	"net/http"
	"strings"
)

const defaultHttp01Location = "/var/www/html/.well-known/acme-challenge"
const configReloadCommand = "sudo nginx -s reload"

type CustomDomainHandler struct {
	processor      *ssl.CustomDomainProcessor
	targetHosts    []string
	user           string
	privateKeyPath string
}

func NewCustomDomainHandler(processor *ssl.CustomDomainProcessor, targetHosts []string, user string, privateKeyPath string) *CustomDomainHandler {
	return &CustomDomainHandler{processor: processor, targetHosts: targetHosts, user: user, privateKeyPath: privateKeyPath}
}

func (h *CustomDomainHandler) Handler(c *gin.Context) {
	domains, err := h.processor.LoadCustomDomains()
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
		return
	}
	validDomains := filterExistingCNames(domains)
	//for _, domain := range validDomains {
	//	fileName, content, err := h.processor.CreateChallenge(domain)
	//	if err != nil {
	//		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//		return
	//	}
	//	err = ioutil.WriteFile(fileName, []byte(content), 0440)
	//	if err != nil {
	//		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//		return
	//	}
	//	for _, client := range h.targetHostsClients{
	//		if err := client.CopyFile(fileName, defaultHttp01Location); err != nil {
	//			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//			return
	//		}
	//	}
	//	if err = h.processor.Validate(domain); err != nil {
	//		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//		return
	//	}
	//}
	cert, private, err := h.processor.LoadCertificate(validDomains)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
		return
	}
	err = ioutil.WriteFile("new_ksense.ai.fullchain.pem", cert, 0666)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
		return
	}
	err = ioutil.WriteFile("new_ksense.ai.pem", private, 0666)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
		return
	}
	client, err := initializeSshClient(h.user, h.privateKeyPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
		return
	}
	for _, host := range h.targetHosts {
		err := client.CopyFile("new_ksense.ai.fullchain.pem", host, "/opt/letsencrypt/certs/ksense.ai.fullchain.pem")
		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
			return
		}
		err = client.CopyFile("new_ksense.ai.pem", host, "/opt/letsencrypt/certs/ksense.ai.pem")
		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
			return
		}

		err = client.ExecuteCommand(host, configReloadCommand)
		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: fmt.Sprintf("failed to execute [%s]", configReloadCommand)})
			return
		}
	}
	c.JSON(http.StatusOK, middleware.OkResponse{Status: "ok"})
}

func initializeSshClient(user string, keyPath string) (*ssh.ClientWrapper, error) {
	return ssh.NewSshClient(keyPath, user)
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
