package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/enhosted/statistics"
	"github.com/ksensehq/eventnative/logging"
	"net/http"
)

type ResponseBody struct {
	Status string                     `json:"status"`
	Data   []statistics.EventsPerTime `json:"data"`
}

type StatisticsHandler struct {
	storage statistics.Storage
}

func NewStatisticsHandler(storage statistics.Storage) *StatisticsHandler {
	return &StatisticsHandler{storage: storage}
}

func (h *StatisticsHandler) GetHandler(c *gin.Context) {
	projectId := c.Query("project_id")
	if projectId == "" {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "[project_id] is a required query parameter"})
		return
	}

	userProjectId := extractProjectId(c)
	if userProjectId == "" {
		logging.Error(systemErrProjectId)
		c.JSON(http.StatusUnauthorized, middleware.ErrorResponse{Error: systemErrProjectId, Message: "Authorization error"})
		return
	}

	if userProjectId != projectId {
		c.JSON(http.StatusUnauthorized, middleware.ErrorResponse{Message: "User does not have access to project " + projectId})
		return
	}

	from := c.Query("from")
	if from == "" {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "[from] is a required query parameter"})
		return
	}
	to := c.Query("to")
	if to == "" {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "[to] is a required query parameter"})
		return
	}
	granularity := c.Query("granularity")
	if granularity != statistics.DayGranularity && granularity != statistics.HourGranularity {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: statistics.ErrParsingGranularityMsg})
		return
	}
	data, err := h.storage.GetEvents(projectId, from, to, granularity)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to provide statistics: " + err.Error(), Error: err})
		logging.Errorf("Failed to provide statistics project_id[%s]: %v", projectId, err)
		return
	}

	response := ResponseBody{Data: data, Status: "ok"}
	c.JSON(http.StatusOK, response)
}
