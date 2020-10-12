package ssl

import (
	"github.com/ksensehq/enhosted/storages"
)

type CustomDomainProcessor struct {
	fbStorage *storages.Firebase
}

func NewCustomDomainProcessor(firebase *storages.Firebase) *CustomDomainProcessor {
	return &CustomDomainProcessor{fbStorage: firebase}
}

func (p *CustomDomainProcessor) LoadCustomDomains() ([]string, error) {
	domains, err := p.fbStorage.GetCustomDomains()
	//domainsByProject := p.Client.Collection("custom_domains").Documents(p.Ctx)
	//for {
	//	customDomains, err := domainsByProject.Next()
	//	if err != nil {
	//		return nil, err
	//	}
	//	domainsListRaw, err := customDomains.DataAt("domains")
	//	if err != nil {
	//		return nil, err
	//	}
	//	println(domainsListRaw)
	//}
	//return nil, nil
	if err != nil {
		return nil, err
	}
	var result []string
	for _, domain := range domains {
		if domain.Name != "" {
			result = append(result, domain.Name)
		}
	}
	return result, nil
}
