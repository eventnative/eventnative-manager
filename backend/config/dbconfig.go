package config

import (
	"fmt"
)

type DbConfig struct {
	Host        string
	ReplicaHost string
	Db          string
	Port        string
	Username    string
	Password    string
}

func (config *DbConfig) GetConnectionString() string {
	connectionString := fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s ",
		config.Host, config.Port, config.Db, config.Username, config.Password)
	return connectionString
}