package handlers

import (
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/eventnative/adapters"
	"github.com/ksensehq/eventnative/logging"
	"net/http"
	"time"
)

const (
	queryTemplate = `select date_trunc('%s', _timestamp) as key, count(*) as value from statistics.statistics
					 where _timestamp between '%s' AND '%s' AND (%s api_key like '%%%s%%')
					 group by key
					 order by key ASC;`
)

type EventsPerTime struct {
	Key    string `json:"key"`
	Events uint   `json:"events"`
}

type ResponseBody struct {
	Status string          `json:"status"`
	Data   []EventsPerTime `json:"data"`
}

type StatisticsHandler struct {
	oldKeysByProject map[string][]string
	statDatasource   *sql.DB
}

func NewStatisticsHandler(config *adapters.DataSourceConfig, oldKeysMapping map[string][]string) (*StatisticsHandler, error) {
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
	return &StatisticsHandler{statDatasource: dataSource, oldKeysByProject: oldKeysMapping}, nil
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
	if granularity != "day" && granularity != "hour" {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "[granularity] is a required query parameter and should have value 'day' or 'hour'"})
		return
	}
	data, err := h.countEventsByProject(projectId, from, to, granularity)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to provide statistics: " + err.Error(), Error: err})
	}
	response := ResponseBody{Data: data, Status: "ok"}
	c.JSON(http.StatusOK, response)
}

func (h *StatisticsHandler) countEventsByProject(projectId string, from string, to string, granularity string) ([]EventsPerTime, error) {
	oldKeysHackPart := ""
	if keys, ok := h.oldKeysByProject[projectId]; ok {
		oldKeysHackPart = "api_key in ("
		for i := range keys {
			oldKeysHackPart = oldKeysHackPart + "'" + keys[i] + "'"
			if i != len(keys)-1 {
				oldKeysHackPart = oldKeysHackPart + ","
			}
		}
		oldKeysHackPart = oldKeysHackPart + ") or"
	}
	query := fmt.Sprintf(queryTemplate, granularity, from, to, oldKeysHackPart, projectId)
	rows, err := h.statDatasource.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	eventsPerTime := make([]EventsPerTime, 0)
	for rows.Next() {
		data := EventsPerTime{}
		var date string
		err := rows.Scan(&date, &data.Events)
		if err != nil {
			return nil, err
		}
		data.Key, err = convertDateToResponseFormat(date)
		if err != nil {
			return nil, err
		}
		eventsPerTime = append(eventsPerTime, data)
	}
	return eventsPerTime, nil
}

func (h *StatisticsHandler) Close() error {
	if err := h.statDatasource.Close(); err != nil {
		return fmt.Errorf("Error closing statistics db: %v", err)
	}

	return nil
}

func convertDateToResponseFormat(dateString string) (string, error) {
	parsed, err := time.Parse("2006-01-02T15:04:05Z", dateString)
	if err != nil {
		return "", err
	}
	return parsed.Format("2006-01-02T15:04:05+0000"), nil
}
