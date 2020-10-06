package entities

type Database struct {
	Host     string `json:"pghost"`
	Port     string `json:"pgport"`
	Database string `json:"pgdatabase"`
	User     string `json:"pguser"`
	Password string `json:"pgpassword"`
}
