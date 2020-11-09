package handlers

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/jitsucom/enhosted/destinations"
	"github.com/jitsucom/enhosted/entities"
	"github.com/jitsucom/enhosted/eventnative"
	"github.com/jitsucom/enhosted/middleware"
	"github.com/jitsucom/enhosted/storages"
	enadapters "github.com/jitsucom/eventnative/adapters"
	endestinations "github.com/jitsucom/eventnative/destinations"
	"github.com/jitsucom/eventnative/logging"
	enmiddleware "github.com/jitsucom/eventnative/middleware"
	"github.com/jitsucom/eventnative/schema"
	enstorages "github.com/jitsucom/eventnative/storages"
	"net/http"
	"time"
)

const (
	defaultStatisticsPostgresDestinationId = "statistics.postgres"
)

type DestinationsHandler struct {
	storage            *storages.Firebase
	defaultS3          *enadapters.S3Config
	statisticsPostgres *enstorages.DestinationConfig

	enService *eventnative.Service
}

func NewDestinationsHandler(storage *storages.Firebase, defaultS3 *enadapters.S3Config, statisticsPostgres *enstorages.DestinationConfig,
	enService *eventnative.Service) *DestinationsHandler {
	return &DestinationsHandler{
		storage:            storage,
		defaultS3:          defaultS3,
		statisticsPostgres: statisticsPostgres,
		enService:          enService,
	}
}

func (dh *DestinationsHandler) GetHandler(c *gin.Context) {
	start := time.Now()
	destinationsMap, err := dh.storage.GetDestinations()
	if err != nil {
		logging.Error(err)
		c.JSON(http.StatusInternalServerError, enmiddleware.ErrorResponse{Error: err, Message: "Destinations err"})
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
			logging.Errorf("Error getting api keys for [%s] project. All destinations will be skipped: %v", projectId, err)
			continue
		}

		if len(keys) == 0 {
			continue
		}

		var projectTokenIds []string
		for _, k := range keys {
			projectTokenIds = append(projectTokenIds, k.Id)
		}

		for _, destination := range destinationsEntity.Destinations {
			destinationId := projectId + "." + destination.Uid
			enDestinationConfig, err := destinations.MapConfig(destinationId, destination, dh.defaultS3)
			if err != nil {
				logging.Errorf("Error mapping destination config for destination type: %s id: %s projectId: %s err: %v", destination.Type, destination.Uid, projectId, err)
				continue
			}

			if len(destination.OnlyKeys) > 0 {
				enDestinationConfig.OnlyTokens = destination.OnlyKeys
			} else {
				enDestinationConfig.OnlyTokens = projectTokenIds
			}

			if !destination.Mappings.IsEmpty() {
				var rules []string
				for _, rule := range destination.Mappings.Rules {
					var cast string
					switch rule.Action {
					case "move", "erase":
						cast = ""
					case "cast/int":
						cast = "(int) "
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
			idConfig[destinationId] = *enDestinationConfig
		}
	}

	if dh.statisticsPostgres != nil {
		//default statistic storage
		idConfig[defaultStatisticsPostgresDestinationId] = *dh.statisticsPostgres
	}

	logging.Infof("Destinations response in [%.2f] seconds", time.Now().Sub(start).Seconds())
	c.JSON(http.StatusOK, &endestinations.Payload{Destinations: idConfig})
}

func (dh *DestinationsHandler) TestHandler(c *gin.Context) {
	destinationEntity := &entities.Destination{}
	err := c.BindJSON(destinationEntity)
	if err != nil {
		c.JSON(http.StatusBadRequest, enmiddleware.ErrorResponse{Message: "Failed to parse request body", Error: err})
		return
	}

	enDestinationConfig, err := destinations.MapConfig("test_connection", destinationEntity, dh.defaultS3)
	if err != nil {
		c.JSON(http.StatusBadRequest, enmiddleware.ErrorResponse{Message: fmt.Sprintf("Failed to map [%s] firebase config to eventnative format", destinationEntity.Type), Error: err})
		return
	}

	b, err := json.Marshal(enDestinationConfig)
	if err != nil {
		c.JSON(http.StatusBadRequest, enmiddleware.ErrorResponse{Message: "Failed to serialize destination config", Error: err})
		return
	}

	code, content, err := dh.enService.TestDestination(b)
	if err != nil {
		c.JSON(http.StatusBadRequest, enmiddleware.ErrorResponse{Message: "Failed to get response from eventnative: " + err.Error(), Error: err})
		return
	}

	if code == http.StatusOK {
		c.JSON(http.StatusOK, middleware.OkResponse{Status: "Connection established"})
		return
	}

	c.Header("Content-Type", jsonContentType)
	c.Writer.WriteHeader(code)

	_, err = c.Writer.Write(content)
	if err != nil {
		c.JSON(http.StatusBadRequest, enmiddleware.ErrorResponse{Message: "Failed to write response", Error: err})
	}
}
