package entities

//ApiKey entity is stored in main storage (Firebase)
type ApiKey struct {
	ClientSecret string   `firestore:"jsAuth" json:"jsAuth" yaml:"jsAuth"`
	ServerSecret string   `firestore:"serverAuth" json:"serverAuth" yaml:"serverAuth"`
	Id           string   `firestore:"uid" json:"uid" yaml:"uid"`
	Origins      []string `firestore:"origins" json:"origins" yaml:"origins"`
}

//ApiKeys entity is stored in main storage (Firebase)
type ApiKeys struct {
	LastUpdated string    `firestore:"_lastUpdated" yaml:"_lastUpdated"`
	Keys        []*ApiKey `firestore:"keys" json:"keys" yaml:"keys"`
}
