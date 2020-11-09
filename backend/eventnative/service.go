package eventnative

import (
	"bytes"
	"encoding/json"
	"fmt"
	enevents "github.com/jitsucom/eventnative/events"
	enhandlers "github.com/jitsucom/eventnative/handlers"
	"github.com/jitsucom/eventnative/logging"
	"io"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

const adminTokenName = "X-Admin-Token"

type Service struct {
	sync.RWMutex

	balancerApiUrl string
	adminToken     string

	client *http.Client

	instanceUrls []string

	closed bool
}

func NewService(balancerApiUrl, adminToken string) *Service {
	s := &Service{
		balancerApiUrl: strings.TrimRight(balancerApiUrl, "/"),
		adminToken:     adminToken,
		client:         &http.Client{Timeout: 1 * time.Minute},

		instanceUrls: []string{},
	}

	s.startClusterMonitor()

	return s
}

func (s *Service) GetEvents(apiKeys []string, limit int) ([]enevents.Fact, error) {
	s.RLock()
	enInstances := s.instanceUrls
	s.RUnlock()

	response := []enevents.Fact{}

	for _, enInstanceUri := range enInstances {
		code, body, err := s.sendReq(http.MethodGet, enInstanceUri+"/api/v1/cache/events?apikeys="+strings.Join(apiKeys, ",")+"&limit_per_apikey="+strconv.Itoa(limit), nil)
		if err != nil {
			return nil, err
		}

		if code != http.StatusOK {
			return nil, fmt.Errorf("Error getting response from EventNative: http code isn't 200: %d", code)
		}

		content := &enhandlers.CachedEventsResponse{}
		if err = json.Unmarshal(body, content); err != nil {
			return nil, fmt.Errorf("Error unmarshalling response from EventNative: %v", err)
		}

		if len(response) == 0 && len(content.Events) >= limit {
			return content.Events[:limit], nil
		}

		response = append(response, content.Events...)

		if len(response) >= limit {
			return response[:limit], nil
		}
	}

	return response, nil
}

func (s *Service) TestDestination(reqB []byte) (int, []byte, error) {
	return s.sendReq(http.MethodPost, s.balancerApiUrl+"/destinations/test", bytes.NewBuffer(reqB))
}

func (s *Service) startClusterMonitor() {
	go func() {
		for {
			if s.closed {
				break
			}

			instanceUrls, err := s.getClusterFromEN()
			if err != nil {
				logging.Errorf("Error getting cluster info from EventNative: %v", err)
				//delay after error
				time.Sleep(10 * time.Second)
				continue
			}

			s.Lock()
			s.instanceUrls = instanceUrls
			s.Unlock()

			time.Sleep(time.Minute)
		}
	}()
}

func (s *Service) getClusterFromEN() ([]string, error) {
	code, body, err := s.sendReq(http.MethodGet, s.balancerApiUrl+"/cluster", nil)
	if err != nil {
		return nil, err
	}

	if code != http.StatusOK {
		return nil, fmt.Errorf("Error getting response from EventNative: http code isn't 200: %d", code)
	}

	content := &enhandlers.ClusterInfo{}
	if err = json.Unmarshal(body, content); err != nil {
		return nil, fmt.Errorf("Error unmarshalling response from EventNative: %v", err)
	}

	instanceUrls := []string{}
	for _, instance := range content.Instances {
		if !strings.HasPrefix(instance.Name, "http") {
			instance.Name = "https://" + instance.Name
		}
		instanceUrls = append(instanceUrls, instance.Name)
	}

	return instanceUrls, nil
}

func (s *Service) sendReq(method, url string, body io.Reader) (int, []byte, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return 0, nil, fmt.Errorf("Error creating request: %v", err)
	}

	req.Header.Add(adminTokenName, s.adminToken)
	resp, err := s.client.Do(req)
	if err != nil {
		return 0, nil, fmt.Errorf("Error getting response from EventNative: %v", err)
	}
	defer resp.Body.Close()

	respBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 0, nil, fmt.Errorf("Error reading response from EventNative: %v", err)
	}

	return resp.StatusCode, respBody, nil
}

func (s *Service) Close() error {
	s.closed = true
	return nil
}
