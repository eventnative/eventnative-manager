package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/entities"
	"github.com/ksensehq/enhosted/ssh"
	"github.com/ksensehq/enhosted/ssl"
	entime "github.com/ksensehq/enhosted/time"
	"github.com/ksensehq/eventnative/middleware"
	"net"
	"net/http"
	"strings"
	"time"
)

const defaultHttp01Location = "/var/www/html/.well-known/acme-challenge"
const configReloadCommand = "sudo nginx -s reload"
const maxDaysBeforeExpiration = 30

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
	domainsPerProject, err := h.processor.LoadCustomDomains()
	if err != nil {

	}
	for projectId, domains := range domainsPerProject {
		println(projectId)
		domainNames := extractDomainNames(domains)
		validDomains := filterExistingCNames(domainNames)
		updateRequired, err := updateRequired(domains, validDomains)
		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
			return
		}
		if !updateRequired {
			continue
		}

		for _, domain := range domains.Domains {
			for _, validDomain := range validDomains {
				if domain.Name == validDomain {
					domain.Status = "test"
				}
			}
		}
		domains.LastUpdated = entime.AsISOString(time.Now())
		expirationDate := time.Now().Local().Add(time.Hour * time.Duration(24*90))
		domains.CertificateExpirationDate = entime.AsISOString(expirationDate)
		err = h.processor.UpdateCustomDomains(projectId, domains)
		if err != nil {
			panic(err)
		}
	}
	//if err != nil {
	//	c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//	return
	//}
	//validDomains := filterExistingCNames(domains)
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

	//cert, private, err := h.processor.LoadCertificate(validDomains)
	//if err != nil {
	//	c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//	return
	//}
	//err = ioutil.WriteFile("new_ksense.ai.fullchain.pem", cert, 0666)
	//if err != nil {
	//	c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//	return
	//}
	//err = ioutil.WriteFile("new_ksense.ai.pem", private, 0666)
	//if err != nil {
	//	c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//	return
	//}
	//client, err := initializeSshClient(h.user, h.privateKeyPath)
	//if err != nil {
	//	c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//	return
	//}
	//for _, host := range h.targetHosts {
	//	err := client.CopyFile("new_ksense.ai.fullchain.pem", host, "/opt/letsencrypt/certs/ksense.ai.fullchain.pem")
	//	if err != nil {
	//		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//		return
	//	}
	//	err = client.CopyFile("new_ksense.ai.pem", host, "/opt/letsencrypt/certs/ksense.ai.pem")
	//	if err != nil {
	//		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
	//		return
	//	}
	//
	//	err = client.ExecuteCommand(host, configReloadCommand)
	//	if err != nil {
	//		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: fmt.Sprintf("failed to execute [%s]", configReloadCommand)})
	//		return
	//	}
	//}
	//c.JSON(http.StatusOK, middleware.OkResponse{Status: "ok"})
}

func updateRequired(domains *entities.CustomDomains, validDomains []string) (bool, error) {
	if domains.LastUpdated == "" || domains.CertificateExpirationDate == "" {
		return true, nil
	}
	expirationDate, err := entime.ParseISOString(domains.CertificateExpirationDate)
	if err != nil {
		return false, err
	}
	lastUpdated, err := entime.ParseISOString(domains.LastUpdated)
	if err != nil {
		return false, err
	}
	days := expirationDate.Sub(lastUpdated).Hours() / 24

	if days < maxDaysBeforeExpiration {
		return true, nil
	}
	for _, domain := range domains.Domains {
		if contains(validDomains, domain.Name) && domain.Status != "ok" {
			return true, nil
		}
	}
	return false, nil
}

func contains(domains []string, name string) bool {
	for _, domain := range domains {
		if name == domain {
			return true
		}
	}
	return false
}

func extractDomainNames(domains *entities.CustomDomains) []string {
	var result []string
	if domains == nil || domains.Domains == nil {
		return result
	}
	for _, domain := range domains.Domains {
		result = append(result, domain.Name)
	}
	return result
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
