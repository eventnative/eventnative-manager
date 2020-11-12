package handlers

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/ksensehq/enhosted/authorization"
	"github.com/ksensehq/eventnative/middleware"
	"net/http"
)

type BecomeUserHandler struct {
	authService *authorization.Service
}

type TokenResponse struct {
	Token string `json:"token"`
}

func (buh *BecomeUserHandler) Handler(c *gin.Context) {
	token := c.GetHeader("X-Client-Auth")
	isAdmin, err := buh.authService.IsAdmin(c, token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, middleware.ErrorResponse{Message: "Only admins may call this API"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusUnauthorized, middleware.ErrorResponse{Message: "Only admins may call this API"})
		return
	}
	userId := c.Query("user_id")
	customToken, err := buh.authService.GenerateUserToken(context.Background(), userId)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.ErrorResponse{Error: err, Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, TokenResponse{Token: customToken})
}
