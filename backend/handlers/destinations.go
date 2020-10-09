package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/destinations"
	"github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/enhosted/storages"
	enadapters "github.com/ksensehq/eventnative/adapters"
	endestinations "github.com/ksensehq/eventnative/destinations"
	"github.com/ksensehq/eventnative/logging"
	enstorages "github.com/ksensehq/eventnative/storages"
	"net/http"
)

const defaultStatisticsBigQueryDestinationId = "statistics.postgres"

type DestinationsHandler struct {
	storage            *storages.Firebase
	defaultS3          enadapters.S3Config
	statisticsPostgres enstorages.DestinationConfig
}

func NewDestinationsHandler(storage *storages.Firebase, defaultS3 enadapters.S3Config, statisticsPostgres enstorages.DestinationConfig) *DestinationsHandler {
	return &DestinationsHandler{storage: storage, defaultS3: defaultS3, statisticsPostgres: statisticsPostgres}
}

func (dh *DestinationsHandler) GetHandler(c *gin.Context) {
	destinationsMap, err := dh.storage.GetDestinations()
	if err != nil {
		logging.Error(err)
		c.JSON(http.StatusInternalServerError, middleware.WebErrorWrapper{Error: err, Message: "Destinations err"})
		return
	}

	idConfig := map[string]enstorages.DestinationConfig{}
	for projectId, destinationsEntity := range destinationsMap {
		if len(destinationsEntity.Destinations) == 0 {
			continue
		}

		//if only tokens empty - put all tokens by project
		keys, err := dh.storage.GetApiKeysByProjectId(projectId)
		if err != nil {
			logging.Errorf("Error getting api keys for [%s] project. All destinations will be skipped", projectId, err)
			continue
		}
		if len(keys) == 0 {
			logging.Errorf("Project [%s] doesn't have api keys. All destinations will be skipped", projectId)
			continue
		}

		var projectTokenIds []string
		for _, k := range keys {
			projectTokenIds = append(projectTokenIds, k.Id)
		}

		for _, destination := range destinationsEntity.Destinations {
			destinationId := projectId + "." + destination.Id

			var enDestinationConfig *enstorages.DestinationConfig
			switch destination.Type {
			case enstorages.PostgresType:
				enDestinationConfig, err = destinations.MapPostgres(destination)
			case enstorages.ClickHouseType:
				enDestinationConfig, err = destinations.MapClickhouse(destination)
			case enstorages.RedshiftType:
				enDestinationConfig, err = destinations.MapRedshift(destinationId, destination, dh.defaultS3)
			default:
				logging.Errorf("Unknown destination type: %s in destination id: %s", destination.Type, destination.Id)
				continue
			}

			if err != nil {
				logging.Errorf("Error mapping destination config for destination type: %s id: %s projectId: %s err: %v", destination.Type, destination.Id, projectId, err)
				continue
			}

			if len(destination.OnlyKeys) > 0 {
				enDestinationConfig.OnlyTokens = destination.OnlyKeys
			} else {
				enDestinationConfig.OnlyTokens = projectTokenIds
			}

			idConfig[destinationId] = *enDestinationConfig
		}
	}

	//default statistic storage
	idConfig[defaultStatisticsBigQueryDestinationId] = dh.statisticsPostgres

	c.JSON(http.StatusOK, &endestinations.Payload{Destinations: idConfig})
}
