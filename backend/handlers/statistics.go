package handlers

import (
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/eventnative/adapters"
	"net/http"
)

type StatisticsHandler struct {
	statDatasource *sql.DB
}

func NewStatisticsHandler(config *adapters.DataSourceConfig) (*StatisticsHandler, error) {
	port := 5432
	if config.Port != 0 {
		port = config.Port
	}
	connectionString := fmt.Sprintf("host=%s port=%d dbname=%s user=%s password=%s ",
		config.Host, port, config.Db, config.Username, config.Password)
	for k, v := range config.Parameters {
		connectionString += k + "=" + v + " "
	}
	dataSource, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}
	if err = dataSource.Ping(); err != nil {
		return nil, err
	}
	return &StatisticsHandler{statDatasource: dataSource}, nil
}

type EventsPerTime struct {
	key    string
	events uint
}

type ResponseBody struct {
	Status string          `json:"status"`
	Data   []EventsPerTime `json:"data"`
}

func (h *StatisticsHandler) Handler(c *gin.Context) {
	projectId := extractQueryParameter(c, "project_id")
	if projectId == "" {
		c.JSON(http.StatusBadGateway, middleware.ErrorResponse{Message: "[project_id] is a required query parameter"})
		return
	}
	from := extractQueryParameter(c, "from")
	if from == "" {
		c.JSON(http.StatusBadGateway, middleware.ErrorResponse{Message: "[from] is a required query parameter"})
		return
	}
	to := extractQueryParameter(c, "to")
	if to == "" {
		c.JSON(http.StatusBadGateway, middleware.ErrorResponse{Message: "[to] is a required query parameter"})
		return
	}
	granularity := extractQueryParameter(c, "granularity")
	if granularity != "day" && granularity != "hour" {
		c.JSON(http.StatusBadGateway, middleware.ErrorResponse{Message: "[granularity] is a required query parameter and should have value 'day' or 'hour'"})
		return
	}
	data, err := h.countEventsByProject(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to provide statistics: " + err.Error(), Error: err})
	}
	response := ResponseBody{Data: data, Status: "ok"}
	c.JSON(http.StatusOK, response)
}

func (h *StatisticsHandler) countEventsByProject(projectId string) ([]EventsPerTime, error) {
	return nil, nil
}

func extractQueryParameter(c *gin.Context, parameterName string) string {
	value, ok := c.GetQuery(parameterName)
	if ok {
		return value
	}
	return ""
}
