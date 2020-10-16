package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/destinations"
	"github.com/ksensehq/enhosted/entities"
	"github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/enhosted/storages"
	enadapters "github.com/ksensehq/eventnative/adapters"
	endestinations "github.com/ksensehq/eventnative/destinations"
	"github.com/ksensehq/eventnative/logging"
	enstorages "github.com/ksensehq/eventnative/storages"
	"io/ioutil"
	"net/http"
	"strings"
	"time"
)

const defaultStatisticsPostgresDestinationId = "statistics.postgres"

type DestinationsHandler struct {
	storage            *storages.Firebase
	defaultS3          *enadapters.S3Config
	statisticsPostgres *enstorages.DestinationConfig

	httpClient            *http.Client
	eventnativeBaseUrl    string
	eventnativeAdminToken string
}

func NewDestinationsHandler(storage *storages.Firebase, defaultS3 *enadapters.S3Config, statisticsPostgres *enstorages.DestinationConfig,
	eventnativeUrl, eventnativeAdminToken string) *DestinationsHandler {
	return &DestinationsHandler{
		storage:               storage,
		defaultS3:             defaultS3,
		statisticsPostgres:    statisticsPostgres,
		httpClient:            &http.Client{Timeout: 1 * time.Minute},
		eventnativeBaseUrl:    strings.TrimRight(eventnativeUrl, "/"),
		eventnativeAdminToken: eventnativeAdminToken,
	}
}

func (dh *DestinationsHandler) GetHandler(c *gin.Context) {
	destinationsMap, err := dh.storage.GetDestinations()
	if err != nil {
		logging.Error(err)
		c.JSON(http.StatusInternalServerError, middleware.ErrorResponse{Error: err, Message: "Destinations err"})
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
			enDestinationConfig, err := destinations.MapConfig(destinationId, destination, dh.defaultS3)
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

	if dh.statisticsPostgres != nil {
		//default statistic storage
		idConfig[defaultStatisticsPostgresDestinationId] = *dh.statisticsPostgres
	}

	c.JSON(http.StatusOK, &endestinations.Payload{Destinations: idConfig})
}

func (dh *DestinationsHandler) TestHandler(c *gin.Context) {
	destinationEntity := &entities.Destination{}
	err := c.BindJSON(destinationEntity)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to parse request body", Error: err})
		return
	}

	enDestinationConfig, err := destinations.MapConfig("test_connection", destinationEntity, dh.defaultS3)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: fmt.Sprintf("Failed to map [%s] firebase config to eventnative format", destinationEntity.Type), Error: err})
		return
	}

	b, err := json.Marshal(enDestinationConfig)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to serialize destination config", Error: err})
		return
	}

	request, err := http.NewRequest("POST", dh.eventnativeBaseUrl+"/destinations/test", bytes.NewBuffer(b))
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error(), Error: err})
		return
	}
	request.Header.Add("X-Admin-Token", dh.eventnativeAdminToken)
	resp, err := dh.httpClient.Do(request)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to get response from eventnative: " + err.Error(), Error: err})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		c.JSON(http.StatusOK, middleware.OkResponse{Status: "Connection established"})
		return
	}

	body, err := ioutil.ReadAll(resp.Body)
	c.Header("Content-Type", jsonContentType)
	c.Writer.WriteHeader(resp.StatusCode)

	_, err = c.Writer.Write(body)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to write response", Error: err})
	}
}
