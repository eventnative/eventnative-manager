package entities

//PostgresFormData entity is stored in main storage (Firebase)
type PostgresFormData struct {
	Mode      string `firestore:"mode" json:"mode"`
	TableName string `firestore:"tableName" json:"tableName"`

	Db       string `firestore:"pgdatabase" json:"pgdatabase"`
	Host     string `firestore:"pghost" json:"pghost"`
	Password string `firestore:"pgpassword" json:"pgpassword"`
	Port     int    `firestore:"pgport" json:"pgport"`
	Schema   string `firestore:"pgschema" json:"pgschema"`
	Username string `firestore:"pguser" json:"pguser"`
}

//ClickHouseFormData entity is stored in main storage (Firebase)
type ClickHouseFormData struct {
	Mode      string `firestore:"mode" json:"mode"`
	TableName string `firestore:"tableName" json:"tableName"`

	ChCluster string `firestore:"ch_cluster" json:"ch_cluster"`
	ChDb      string `firestore:"ch_database" json:"ch_database"`
	ChDsns    string `firestore:"ch_dsns" json:"ch_dsns"`
}

//RedshiftFormData entity is stored in main storage (Firebase)
type RedshiftFormData struct {
	Mode      string `firestore:"mode" json:"mode"`
	TableName string `firestore:"tableName" json:"tableName"`

	Host     string `firestore:"redhsiftHost" json:"redhsiftHost"`
	Db       string `firestore:"redshiftDB" json:"redshiftDB"`
	Password string `firestore:"redshiftPassword" json:"redshiftPassword"`
	Schema   string `firestore:"redshiftSchema" json:"redshiftSchema"`
	Username string `firestore:"redshiftUser" json:"redshiftUser"`

	S3AccessKey string `firestore:"redshiftS3AccessKey" json:"redshiftS3AccessKey"`
	S3Bucket    string `firestore:"redshiftS3Bucket" json:"redshiftS3Bucket"`
	S3Region    string `firestore:"redshiftS3Region" json:"redshiftS3Region"`
	S3SecretKey string `firestore:"redshiftS3SecretKey" json:"redshiftS3SecretKey"`
	UseHostedS3 bool   `firestore:"redshiftUseHostedS3" json:"redshiftUseHostedS3"`
}
