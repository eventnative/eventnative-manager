package destinations

import (
	"encoding/json"
	"fmt"
	"github.com/ksensehq/enhosted/entities"
	enadapters "github.com/ksensehq/eventnative/adapters"
	enstorages "github.com/ksensehq/eventnative/storages"
	"strings"
)

func MapPostgres(pgDestinations *entities.Destination) (*enstorages.DestinationConfig, error) {
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

func MapClickhouse(chDestinations *entities.Destination) (*enstorages.DestinationConfig, error) {
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

func MapRedshift(destinationId string, rsDestinations *entities.Destination, defaultS3 enadapters.S3Config) (*enstorages.DestinationConfig, error) {
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

	return &enstorages.DestinationConfig{
		Type: enstorages.RedshiftType,
		Mode: rsFormData.Mode,
		DataLayout: &enstorages.DataLayout{
			TableNameTemplate: rsFormData.TableName,
		},
		DataSource: &enadapters.DataSourceConfig{
			Host:     rsFormData.Host,
			Db:       rsFormData.Db,
			Schema:   rsFormData.Schema,
			Username: rsFormData.Username,
			Password: rsFormData.Password,
		},
		S3: s3,
	}, nil
}
