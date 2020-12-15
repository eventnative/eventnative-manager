package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/jitsucom/enhosted/generated/jitsu"
	"github.com/jitsucom/enhosted/storages"
	"github.com/jitsucom/eventnative/drivers"
	"github.com/jitsucom/eventnative/logging"
	enmiddleware "github.com/jitsucom/eventnative/middleware"
	"net/http"
	"time"
)

type SourcesHandler struct {
	storage *storages.Firebase
}

func NewSourcesHandler(storage *storages.Firebase) *SourcesHandler {
	return &SourcesHandler{storage}
}

func (akh *SourcesHandler) GetHandler(c *gin.Context) {
	start := time.Now()
	sources, err := akh.storage.GetSources()
	if err != nil {
		logging.Error(err)
		c.JSON(http.StatusInternalServerError, enmiddleware.ErrorResponse{Error: err.Error(), Message: "Api keys err"})
		return
	}
	response := map[string]*drivers.SourceConfig{}
	for projectId, sourceConfig := range sources {
		for _, configuration := range sourceConfig {
			sourceId := projectId + "." + configuration.Id
			response[sourceId] = akh.toEventnativeConfiguration(configuration)
		}
	}
	logging.Infof("Sources response in [%.2f] seconds", time.Now().Sub(start).Seconds())
	c.JSON(http.StatusOK, response)
}

func (akh *SourcesHandler) toEventnativeConfiguration(sourceConfiguration *jitsu.SourceConfiguration) *drivers.SourceConfig {
	var collections []interface{}
	for _, collection := range sourceConfiguration.Collections {
		collections = append(collections, collection)
	}
	return &drivers.SourceConfig{
		Type:         sourceConfiguration.TypeName,
		Destinations: sourceConfiguration.DestinationIds,
		Collections:  collections,
		Config:       sourceConfiguration.Config.AsMap()}
}
