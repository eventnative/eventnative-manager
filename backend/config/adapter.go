package config

import (
	"github.com/ksensehq/eventnative/adapters"
	"strings"
)

type RedshiftConfig struct {
	DbConfig *adapters.DataSourceConfig `json:"database"`
	S3Config *adapters.S3Config         `json:"s3"`
}

func TransformPostgres(sourceConfig map[string]interface{}) (*adapters.DataSourceConfig, error) {
	port := 5432
	if val, ok := sourceConfig["pgport"]; ok {
		parsedPort := val.(float64)
		port = int(parsedPort)
	}
	pgConfig := adapters.DataSourceConfig{Host: sourceConfig["pghost"].(string), Port: port,
		Username: sourceConfig["pguser"].(string), Password: sourceConfig["pgpassword"].(string),
		Db: sourceConfig["pgdatabase"].(string)}
	return &pgConfig, nil
}

func TransformRedshift(sourceConfig map[string]interface{}) (*RedshiftConfig, error) {
	rsConfig := RedshiftConfig{}
	if sourceConfig["mode"] == "batch" {
		s3Config := adapters.S3Config{AccessKeyID: sourceConfig["redshiftS3AccessKey"].(string),
			SecretKey: sourceConfig["redshiftS3SecretKey"].(string), Bucket: sourceConfig["redshiftS3Bucket"].(string),
			Region: sourceConfig["redshiftS3Region"].(string)}
		rsConfig.S3Config = &s3Config
	}
	port := 5439
	if val, ok := sourceConfig["redshiftPort"]; ok {
		parsedPort := val.(float64)
		port = int(parsedPort)
	}
	dbConfig := adapters.DataSourceConfig{Schema: sourceConfig["redshiftSchema"].(string),
		Host: sourceConfig["redshiftHost"].(string), Port: port, Db: sourceConfig["redshiftDB"].(string),
		Username: sourceConfig["redshiftUser"].(string), Password: sourceConfig["redshiftPassword"].(string)}
	rsConfig.DbConfig = &dbConfig
	return &rsConfig, nil
}

func TransformClickhouse(sourceConfig map[string]interface{}) (*adapters.ClickHouseConfig, error) {
	rawDsns := sourceConfig["ch_dsns"].(string)
	dsns := strings.Split(rawDsns, ",")
	for i := range dsns {
		dsns[i] = strings.TrimSpace(dsns[i])
	}
	return &adapters.ClickHouseConfig{Cluster: sourceConfig["ch_cluster"].(string), Database: sourceConfig["ch_database"].(string), Dsns: dsns}, nil

}
