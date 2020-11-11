package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/jitsucom/enhosted/storages"
	enauth "github.com/jitsucom/eventnative/authorization"
	"github.com/jitsucom/eventnative/logging"
	enmiddleware "github.com/jitsucom/eventnative/middleware"
	"net/http"
	"time"
)

type ApiKeysHandler struct {
	storage *storages.Firebase
}

func NewApiKeysHandler(storage *storages.Firebase) *ApiKeysHandler {
	return &ApiKeysHandler{storage}
}

func (akh *ApiKeysHandler) GetHandler(c *gin.Context) {
	start := time.Now()
	keys, err := akh.storage.GetApiKeys()
	if err != nil {
		logging.Error(err)
		c.JSON(http.StatusInternalServerError, enmiddleware.ErrorResponse{Error: err.Error(), Message: "Api keys err"})
		return
	}

	var tokens []enauth.Token
	for _, k := range keys {
		tokens = append(tokens, enauth.Token{
			Id:           k.Id,
			ClientSecret: k.ClientSecret,
			ServerSecret: k.ServerSecret,
			Origins:      k.Origins,
		})
	}

	logging.Infof("ApiKeys response in [%.2f] seconds", time.Now().Sub(start).Seconds())
	c.JSON(http.StatusOK, &enauth.TokensPayload{Tokens: tokens})
}
