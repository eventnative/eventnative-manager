package entities

type CustomDomain struct {
	Name   string `firestore:"name" json:"name"`
	Status string `firestore:"status" json:"status"`
}

type CustomDomains struct {
	LastUpdated               string          `firestore:"_lastUpdated"`
	CertificateExpirationDate string          `firestore:"_certificateExpiration"`
	Domains                   []*CustomDomain `firestore:"domains" json:"domains"`
}
