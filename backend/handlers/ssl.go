package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/entities"
	files "github.com/ksensehq/enhosted/files"
	"github.com/ksensehq/enhosted/ssl"
	entime "github.com/ksensehq/enhosted/time"
	"github.com/ksensehq/eventnative/middleware"
	"io/ioutil"
	"net"
	"net/http"
	"strings"
	"time"
)

const maxDaysBeforeExpiration = 30
const okStatus = "ok"
const rwPermission = 0666

type CustomDomainHandler struct {
	sslService               *ssl.CustomDomainService
	enHosts                  []string
	user                     string
	privateKeyPath           string
	enCName                  string // required to validate if CNAME is set to our balancer
	sslCertificatesStorePath string
	sslPkStorePath           string
	acmeChallengePath        string
}

func NewCustomDomainHandler(processor *ssl.CustomDomainService, targetHosts []string, user string, privateKeyPath string, balancerName string, certsPath string, pkPath string, acmeChallengePath string) *CustomDomainHandler {
	return &CustomDomainHandler{sslService: processor, enHosts: targetHosts, user: user, privateKeyPath: privateKeyPath, enCName: balancerName, sslCertificatesStorePath: files.FixPath(certsPath), sslPkStorePath: files.FixPath(pkPath), acmeChallengePath: files.FixPath(acmeChallengePath)}
}

func (h *CustomDomainHandler) Handler(c *gin.Context) {
	err := h.run()
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, middleware.OkResponse{Status: "ok"})
}

func (h *CustomDomainHandler) run() error {
	domainsPerProject, err := h.sslService.LoadCustomDomains()
	if err != nil {

	}
	for projectId, domains := range domainsPerProject {
		domainNames := extractDomainNames(domains)
		validDomains := filterExistingCNames(domainNames, h.enCName)
		updateRequired, err := updateRequired(domains, validDomains)
		if err != nil {
			return err
		}
		if !updateRequired {
			continue
		}

		certificate, privateKey, err := h.sslService.ExecuteHttp01Challenge(validDomains)
		if err != nil {
			return err
		}
		certFileName := h.sslCertificatesStorePath + projectId + "_cert.pem"
		err = ioutil.WriteFile(certFileName, certificate, rwPermission)
		if err != nil {
			return err
		}
		pkFileName := h.privateKeyPath + projectId + "_pk.pem"
		err = ioutil.WriteFile(pkFileName, privateKey, rwPermission)
		if err != nil {
			return err
		}
		if err = h.sslService.UploadCertificate(certFileName, pkFileName, projectId, validDomains, h.enHosts); err != nil {
			return err
		}

		for _, domain := range domains.Domains {
			if contains(validDomains, domain.Name) {
				domain.Status = okStatus
			}
		}
		domains.LastUpdated = entime.AsISOString(time.Now().UTC())
		expirationDate := time.Now().UTC().Add(time.Hour * time.Duration(24*90))
		domains.CertificateExpirationDate = entime.AsISOString(expirationDate)
		err = h.sslService.UpdateCustomDomains(projectId, domains)
		if err != nil {
			return err
		}
	}
	return nil
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
		if contains(validDomains, domain.Name) && domain.Status != okStatus {
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

func filterExistingCNames(domains []string, enCName string) []string {
	isNotDigit := func(c rune) bool { return c < '0' || c > '9' }
	resultDomains := make([]string, 0)
	for _, domain := range domains {
		onlyNumbers := strings.IndexFunc(domain, isNotDigit) == -1
		if !onlyNumbers {
			if cname, err := net.LookupCNAME(domain); err == nil {
				if strings.TrimRight(cname, ".") == enCName {
					resultDomains = append(resultDomains, domain)
				}
			}
		}
	}
	return resultDomains
}
