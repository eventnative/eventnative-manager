package destinations

import (
	"encoding/json"
	"fmt"
	"github.com/jitsucom/enhosted/entities"
	enadapters "github.com/jitsucom/eventnative/adapters"
	"github.com/jitsucom/eventnative/schema"
	enstorages "github.com/jitsucom/eventnative/storages"
	"strings"
)

func MapConfig(destinationId string, destination *entities.Destination, defaultS3 *enadapters.S3Config) (*enstorages.DestinationConfig, error) {
	var config *enstorages.DestinationConfig
	var err error
	switch destination.Type {
	case enstorages.PostgresType:
		config, err = mapPostgres(destination)
	case enstorages.ClickHouseType:
		config, err = mapClickhouse(destination)
	case enstorages.RedshiftType:
		config, err = mapRedshift(destinationId, destination, defaultS3)
	case enstorages.BigQueryType:
		config, err = mapBigQuery(destination)
	case enstorages.SnowflakeType:
		config, err = mapSnowflake(destination)
	default:
		return nil, fmt.Errorf("Unknown destination type: %s", destination.Type)
	}
	if err != nil {
		return nil, err
	}
	enrichMappingRules(destination, config)
	return config, nil
}

func mapBigQuery(bqDestination *entities.Destination) (*enstorages.DestinationConfig, error) {
	b, err := json.Marshal(bqDestination.Data)
	if err != nil {
		return nil, fmt.Errorf("error marshaling BigQuery config destination: %v", err)
	}

	bqFormData := &entities.BigQueryFormData{}
	err = json.Unmarshal(b, bqFormData)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling BigQuery form data: %v", err)
	}
	gcs := &enadapters.GoogleConfig{Project: bqFormData.ProjectId, Bucket: bqFormData.GCSBucket,
		KeyFile: bqFormData.JsonKey, Dataset: bqFormData.Dataset}
	return &enstorages.DestinationConfig{
		Type: enstorages.BigQueryType,
		Mode: bqFormData.Mode,
		DataLayout: &enstorages.DataLayout{
			TableNameTemplate: bqFormData.TableName,
		},
		Google: gcs,
	}, nil
}

func mapPostgres(pgDestinations *entities.Destination) (*enstorages.DestinationConfig, error) {
	b, err := json.Marshal(pgDestinations.Data)
	if err != nil {
		return nil, fmt.Errorf("Error marshaling postgres config destination: %v", err)
	}

	pgFormData := &entities.PostgresFormData{}
	err = json.Unmarshal(b, pgFormData)
	if err != nil {
		return nil, fmt.Errorf("Error unmarshaling postgres form data: %v", err)
	}

	return &enstorages.DestinationConfig{
		Type: enstorages.PostgresType,
		Mode: pgFormData.Mode,
		DataLayout: &enstorages.DataLayout{
			TableNameTemplate: pgFormData.TableName,
			PrimaryKeyFields:  pgFormData.PKFields,
		},
		DataSource: &enadapters.DataSourceConfig{
			Host:     pgFormData.Host,
			Port:     pgFormData.Port,
			Db:       pgFormData.Db,
			Schema:   pgFormData.Schema,
			Username: pgFormData.Username,
			Password: pgFormData.Password,
		},
	}, nil
}

func mapClickhouse(chDestinations *entities.Destination) (*enstorages.DestinationConfig, error) {
	b, err := json.Marshal(chDestinations.Data)
	if err != nil {
		return nil, fmt.Errorf("Error marshaling clickhouse config destination: %v", err)
	}

	chFormData := &entities.ClickHouseFormData{}
	err = json.Unmarshal(b, chFormData)
	if err != nil {
		return nil, fmt.Errorf("Error unmarshaling clickhouse form data: %v", err)
	}

	return &enstorages.DestinationConfig{
		Type: enstorages.ClickHouseType,
		Mode: chFormData.Mode,
		DataLayout: &enstorages.DataLayout{
			TableNameTemplate: chFormData.TableName,
		},
		ClickHouse: &enadapters.ClickHouseConfig{
			Dsns:     strings.Split(chFormData.ChDsns, ","),
			Database: chFormData.ChDb,
			Cluster:  chFormData.ChCluster,
		},
	}, nil
}

func mapRedshift(destinationId string, rsDestinations *entities.Destination, defaultS3 *enadapters.S3Config) (*enstorages.DestinationConfig, error) {
	b, err := json.Marshal(rsDestinations.Data)
	if err != nil {
		return nil, fmt.Errorf("Error marshaling redshift config destination: %v", err)
	}

	rsFormData := &entities.RedshiftFormData{}
	err = json.Unmarshal(b, rsFormData)
	if err != nil {
		return nil, fmt.Errorf("Error unmarshaling redshift form data: %v", err)
	}

	var s3 *enadapters.S3Config
	if rsFormData.UseHostedS3 {
		s3 = &enadapters.S3Config{
			AccessKeyID: defaultS3.AccessKeyID,
			SecretKey:   defaultS3.SecretKey,
			Bucket:      defaultS3.Bucket,
			Region:      defaultS3.Region,
			Folder:      destinationId,
		}
	} else if rsFormData.Mode == enstorages.BatchMode {
		s3 = &enadapters.S3Config{
			AccessKeyID: rsFormData.S3AccessKey,
			SecretKey:   rsFormData.S3SecretKey,
			Bucket:      rsFormData.S3Bucket,
			Region:      rsFormData.S3Region,
			Folder:      destinationId,
		}
	}

	config := enstorages.DestinationConfig{
		Type: enstorages.RedshiftType,
		Mode: rsFormData.Mode,
		DataLayout: &enstorages.DataLayout{
			TableNameTemplate: rsFormData.TableName,
		},
		DataSource: &enadapters.DataSourceConfig{
			Host:     rsFormData.Host,
			Port:     5439,
			Db:       rsFormData.Db,
			Schema:   rsFormData.Schema,
			Username: rsFormData.Username,
			Password: rsFormData.Password,
		},
		S3: s3,
	}
	return &config, nil
}

func mapSnowflake(snowflakeDestination *entities.Destination) (*enstorages.DestinationConfig, error) {
	b, err := json.Marshal(snowflakeDestination.Data)
	if err != nil {
		return nil, fmt.Errorf("error marshaling Snowflake config destination: %v", err)
	}

	snowflakeFormData := &entities.SnowflakeFormData{}
	err = json.Unmarshal(b, snowflakeFormData)
	if err != nil {
		return nil, fmt.Errorf("error unmarshaling Snowflake form data: %v", err)
	}
	var s3 *enadapters.S3Config
	var gcs *enadapters.GoogleConfig
	if snowflakeFormData.S3Bucket != "" {
		s3 = &enadapters.S3Config{Region: snowflakeFormData.S3Region, Bucket: snowflakeFormData.S3Bucket, AccessKeyID: snowflakeFormData.S3AccessKey, SecretKey: snowflakeFormData.S3SecretKey}
	} else if snowflakeFormData.GCSBucket != "" {
		gcs = &enadapters.GoogleConfig{Bucket: snowflakeFormData.GCSBucket, KeyFile: snowflakeFormData.GCSKey}
	}
	return &enstorages.DestinationConfig{
		Type: enstorages.SnowflakeType,
		Mode: snowflakeFormData.Mode,
		DataLayout: &enstorages.DataLayout{
			TableNameTemplate: snowflakeFormData.TableName,
		},
		Snowflake: &enadapters.SnowflakeConfig{Account: snowflakeFormData.Account, Warehouse: snowflakeFormData.Warehouse, Db: snowflakeFormData.DB, Schema: snowflakeFormData.Schema, Username: snowflakeFormData.Username, Password: snowflakeFormData.Password, Stage: snowflakeFormData.StageName},
		S3:        s3,
		Google:    gcs,
	}, nil
}

func enrichMappingRules(destination *entities.Destination, enDestinationConfig *enstorages.DestinationConfig) {
	if !destination.Mappings.IsEmpty() {
		var rules []string
		for _, rule := range destination.Mappings.Rules {
			var cast string
			switch rule.Action {
			case "move", "erase":
				cast = ""
			case "cast/int":
				cast = "(integer) "
			case "cast/double":
				cast = "(double) "
			case "cast/date":
				cast = "(timestamp) "
			case "cast/string":
				cast = "(string) "
			}
			rules = append(rules, rule.SourceField+" -> "+cast+rule.DestinationField)
		}
		enDestinationConfig.DataLayout.Mapping = rules
		mappingType := schema.Default
		if !destination.Mappings.KeepFields {
			mappingType = schema.Strict
		}
		enDestinationConfig.DataLayout.MappingType = mappingType
	}
}
