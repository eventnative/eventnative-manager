package entities

//Destination entity is stored in main storage (Firebase)
type Destination struct {
	Id       string      `firestore:"_id" json:"_id"`
	Uid      string      `firestore:"_uid" json:"_uid"`
	Type     string      `firestore:"_type"  json:"_type"`
	Data     interface{} `firestore:"_formData" json:"_formData"`
	Mappings Mappings    `firestore:"_mappings" json:"_mappings"`
	OnlyKeys []string    `firestore:"_onlyKeys" json:"_onlyKeys"`
}

//Destinations entity is stored in main storage (Firebase)
type Destinations struct {
	LastUpdated  string         `firestore:"_lastUpdated"`
	Destinations []*Destination `firestore:"destinations" json:"destinations"`
}

type Mappings struct {
	KeepFields bool      `firestore:"_keepUnmappedFields" json:"_keepUnmappedFields"`
	Rules      []MapRule `firestore:"_mappings" json:"_mappings"`
}

func (m Mappings) IsEmpty() bool {
	return len(m.Rules) == 0
}

type MapRule struct {
	Action           string `firestore:"_action" json:"_action"`
	SourceField      string `firestore:"_srcField" json:"_srcField"`
	DestinationField string `firestore:"_dstField" json:"_dstField"`
}
