package entities

//Destination entity is stored in main storage (Firebase)
type Destination struct {
	Id       string      `firestore:"_uid" json:"_uid"`
	Type     string      `firestore:"_type"  json:"_type"`
	Data     interface{} `firestore:"_formData" json:"_formData"`
	OnlyKeys []string    `firestore:"_onlyKeys" json:"_onlyKeys"`
}

//Destinations entity is stored in main storage (Firebase)
type Destinations struct {
	LastUpdated  string         `firestore:"_lastUpdated"`
	Destinations []*Destination `firestore:"destinations" json:"destinations"`
}
