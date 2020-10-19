package entities

//ApiKey entity is stored in main storage (Firebase)
type ApiKey struct {
	ClientSecret string   `firestore:"jsAuth" json:"jsAuth"`
	ServerSecret string   `firestore:"serverAuth" json:"serverAuth"`
	Id           string   `firestore:"uid" json:"uid"`
	Origins      []string `firestore:"origins" json:"origins"`
}

//ApiKeys entity is stored in main storage (Firebase)
type ApiKeys struct {
	LastUpdated string    `firestore:"_lastUpdated"`
	Keys        []*ApiKey `firestore:"keys" json:"keys"`
}
