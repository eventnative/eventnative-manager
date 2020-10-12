package entities

type CustomDomain struct {
	Name string `firestore:"name" json:"name"`
}

type CustomDomains struct {
	Domains []*CustomDomain `firestore:"domains" json:"domains"`
}
