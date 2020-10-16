package ssl

import (
	"github.com/ksensehq/enhosted/storages"
	"io/ioutil"
)

type CustomDomainProcessor struct {
	fbStorage *storages.Firebase
}

func NewCustomDomainProcessor(firebase *storages.Firebase) *CustomDomainProcessor {
	return &CustomDomainProcessor{fbStorage: firebase}
}

func (p *CustomDomainProcessor) CreateChallenge(domain string) (string, string, error) {

	//http01.NewChallenge()
	return "", "", nil
}

func (p *CustomDomainProcessor) Validate(domain string) error {
	return nil
}

// Mock while testing
func (p *CustomDomainProcessor) LoadCertificate(domains []string) ([]byte, []byte, error) {
	cert, err := ioutil.ReadFile("/Users/arr/IdeaProjects/eventnative-hosted/ksense.ai.fullchain.pem")
	if err != nil {
		return nil, nil, err
	}
	private, err := ioutil.ReadFile("/Users/arr/IdeaProjects/eventnative-hosted/ksense.ai.pem")
	if err != nil {
		return nil, nil, err
	}
	return cert, private, nil
}

func (p *CustomDomainProcessor) LoadCustomDomains() ([]string, error) {
	domains, err := p.fbStorage.GetCustomDomains()
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
