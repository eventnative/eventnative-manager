package statistics

import (
	"errors"
	"github.com/ksensehq/eventnative/logging"
	enstorages "github.com/ksensehq/eventnative/storages"
	"io"
)

const (
	DayGranularity  = "day"
	HourGranularity = "hour"

	ErrParsingGranularityMsg = `[granularity] is a required query parameter and should have value 'day' or 'hour'`

	requestTimestampLayout  = "2006-01-02T15:04:05Z"
	responseTimestampLayout = "2006-01-02T15:04:05+0000"
)

type EventsPerTime struct {
	Key    string `json:"key"`
	Events uint   `json:"events"`
}

type Storage interface {
	io.Closer
	GetEvents(projectId, from, to, granularity string) ([]EventsPerTime, error)
}

func NewStorage(pgConfig *enstorages.DestinationConfig, promConfig *PrometheusConfig, oldKeysByProject map[string][]string) (Storage, error) {
	if promConfig != nil {
		logging.Info("Statistics storage: prometheus")
		return NewPrometheus(promConfig)
	}

	if pgConfig != nil {
		logging.Info("Statistics storage: postgres")
		return NewPostgres(pgConfig.DataSource, oldKeysByProject)
	}

	return nil, errors.New("Statistics storage configuration wasn't found")
}
