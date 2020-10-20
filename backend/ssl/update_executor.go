package ssl

import (
	"github.com/ksensehq/enhosted/entities"
	"github.com/ksensehq/enhosted/files"
	entime "github.com/ksensehq/enhosted/time"
	"github.com/ksensehq/eventnative/logging"
	"io/ioutil"
	"net"
	"strings"
	"time"
)

const maxDaysBeforeExpiration = 30
const okStatus = "ok"

type UpdateExecutor struct {
	sslService               *CertificateService
	enHosts                  []string
	user                     string
	privateKeyPath           string
	enCName                  string // required to validate if CNAME is set to our balancer
	sslCertificatesStorePath string
	sslPkStorePath           string
	acmeChallengePath        string
}

func NewSSLUpdateExecutor(processor *CertificateService, targetHosts []string, user string, privateKeyPath string, balancerName string, certsPath string, pkPath string, acmeChallengePath string) *UpdateExecutor {
	return &UpdateExecutor{sslService: processor, enHosts: targetHosts, user: user, privateKeyPath: privateKeyPath, enCName: balancerName, sslCertificatesStorePath: files.FixPath(certsPath), sslPkStorePath: files.FixPath(pkPath), acmeChallengePath: files.FixPath(acmeChallengePath)}
}

func (e *UpdateExecutor) Schedule(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for {
			<-ticker.C
			if err := e.Run(); err != nil {
				logging.Errorf("Failed to update SSL certificates: %s", err)
			}
		}
	}()
}

func (e *UpdateExecutor) Run() error {
	domainsPerProject, err := e.sslService.LoadCustomDomains()
	if err != nil {
		return err
	}
	for projectId, domains := range domainsPerProject {
		if err := e.processProjectDomains(projectId, domains); err != nil {
			logging.Error(err)
			return err
		}
	}
	return nil
}

func (e *UpdateExecutor) RunForProject(projectId string) error {
	domains, err := e.sslService.LoadCustomDomainsByProjectId(projectId)
	if err != nil {
		return err
	}
	return e.processProjectDomains(projectId, domains)
}

func (e *UpdateExecutor) processProjectDomains(projectId string, domains *entities.CustomDomains) error {
	domainNames := extractDomainNames(domains)
	validDomains := filterExistingCNames(domainNames, e.enCName)
	updateRequired, err := updateRequired(domains, validDomains)
	if err != nil {
		return err
	}
	if !updateRequired {
		return nil
	}

	certificate, privateKey, err := e.sslService.ExecuteHttp01Challenge(validDomains)
	if err != nil {
		return err
	}
	certFileName := e.sslCertificatesStorePath + projectId + "_cert.pem"
	err = ioutil.WriteFile(certFileName, certificate, rwPermission)
	if err != nil {
		return err
	}
	pkFileName := e.privateKeyPath + projectId + "_pk.pem"
	err = ioutil.WriteFile(pkFileName, privateKey, rwPermission)
	if err != nil {
		return err
	}
	if err = e.sslService.UploadCertificate(certFileName, pkFileName, projectId, validDomains, e.enHosts); err != nil {
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
	err = e.sslService.UpdateCustomDomains(projectId, domains)
	if err != nil {
		return err
	}
	return nil
}

func updateRequired(domains *entities.CustomDomains, validDomains []string) (bool, error) {
	if validDomains == nil || len(validDomains) == 0 {
		return false, nil
	}
	if domains.LastUpdated == "" || domains.CertificateExpirationDate == "" {
		return true, nil
	}
	expirationDate, err := entime.ParseISOString(domains.CertificateExpirationDate)
	if err != nil {
		return false, err
	}
	days := expirationDate.Sub(time.Now().UTC()).Hours() / 24

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
