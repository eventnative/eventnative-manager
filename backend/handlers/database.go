package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/config"
	"github.com/ksensehq/enhosted/middleware"
	"github.com/ksensehq/enhosted/storages"
	"github.com/ksensehq/eventnative/logging"
	"io/ioutil"
	"net/http"
	"strings"
)

var systemErrProjectId = fmt.Errorf("System error: %s wasn't found in context" + middleware.ProjectIdKey)

const jsonContentType = "application/json"

type DatabaseHandler struct {
	storage              *storages.Firebase
	eventnativeBaseUrl   string
	eventnativAdminToken string
	httpClient           *http.Client
}

type DbCreationRequestBody struct {
	ProjectId string `json:"projectId"`
}

func NewDatabaseHandler(storage *storages.Firebase, eventnativeUrl string, eventnativeAdminToken string) *DatabaseHandler {
	client := http.Client{}
	return &DatabaseHandler{storage: storage, eventnativeBaseUrl: strings.TrimRight(eventnativeUrl, "/"), eventnativAdminToken: eventnativeAdminToken, httpClient: &client}
}

func (eh *DatabaseHandler) PostHandler(c *gin.Context) {
	body := DbCreationRequestBody{}
	if err := c.BindJSON(&body); err != nil {
		c.Writer.WriteHeader(http.StatusBadRequest)
		return
	}
	projectId := body.ProjectId
	userProjectId := extractProjectId(c)
	if userProjectId == "" {
		logging.Error(systemErrProjectId)
		c.JSON(http.StatusUnauthorized, middleware.WebErrorWrapper{Error: systemErrProjectId, Message: "Authorization error"})
		return
	}

	if userProjectId != projectId {
		c.JSON(http.StatusUnauthorized, middleware.WebErrorWrapper{Message: "User does not have access to project " + projectId})
		return
	}

	database, err := eh.storage.CreateDatabase(projectId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.WebErrorWrapper{Error: err, Message: "Failed to create a database for project " + projectId})
		return
	}

	c.JSON(http.StatusOK, database)
}

type ConnectionConfig struct {
	DestinationType  string      `json:"type"`
	ConnectionConfig interface{} `json:"config"`
}

func (eh *DatabaseHandler) TestHandler(c *gin.Context) {
	var connectionConfig interface{}
	err := c.BindJSON(&connectionConfig)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to parse request body", Error: err})
		return
	}
	parsedConnectionConfig := connectionConfig.(map[string]interface{})
	eventnativeConnectionConfig := ConnectionConfig{}
	switch parsedConnectionConfig["type"] {
	case "postgres":
		eventnativeConnectionConfig.DestinationType = "postgres"
		postgresConfig, err := config.TransformPostgres(parsedConnectionConfig)
		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to convert Postgres firebase config to eventnative format", Error: err})
			return
		}
		eventnativeConnectionConfig.ConnectionConfig = postgresConfig
		break

	case "clickhouse":
		eventnativeConnectionConfig.DestinationType = "clickhouse"
		chConfig, err := config.TransformClickhouse(parsedConnectionConfig)
		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to convert ClickHouse firebase config to eventnative format", Error: err})
			return
		}
		eventnativeConnectionConfig.ConnectionConfig = chConfig
		break
	case "redshift":
		eventnativeConnectionConfig.DestinationType = "redshift"
		rhConfig, err := config.TransformRedshift(parsedConnectionConfig)
		if err != nil {
			c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to convert firebase Redshift config to eventnative format", Error: err})
			return
		}
		eventnativeConnectionConfig.ConnectionConfig = rhConfig
		break
	default:
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Unknown type " + parsedConnectionConfig["_type"].(string)})
		return
	}

	dbConfig, err := json.Marshal(eventnativeConnectionConfig)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to serialize database config", Error: err})
		return
	}
	request, err := http.NewRequest("POST", eh.eventnativeBaseUrl+"/test_connection", bytes.NewBuffer(dbConfig))
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: err.Error(), Error: err})
		return
	}
	request.Header.Add("X-Admin-Token", eh.eventnativAdminToken)
	resp, err := eh.httpClient.Do(request)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to get response from eventnative: " + err.Error(), Error: err})
		return
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)

	c.Header("Content-Type", jsonContentType)
	c.Writer.WriteHeader(resp.StatusCode)
	_, err = c.Writer.Write(body)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Message: "Failed to write response", Error: err})
	}
}

func extractProjectId(c *gin.Context) string {
	iface, ok := c.Get(middleware.ProjectIdKey)
	if !ok {
		return ""
	}
	return iface.(string)
}
