package authorization

import (
	"cloud.google.com/go/firestore"
	"context"
	"firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
	"google.golang.org/api/option"
	"strings"
)

type Service struct {
	authClient      *auth.Client
	firestoreClient *firestore.Client
}

func NewService(ctx context.Context, firebaseViper *viper.Viper) (*Service, error) {
	app, err := firebase.NewApp(context.Background(),
		&firebase.Config{ProjectID: firebaseViper.GetString("project_id")},
		option.WithCredentialsFile(firebaseViper.GetString("credentials_file")))
	if err != nil {
		return nil, err
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}

	firestoreClient, err := app.Firestore(context.Background())
	if err != nil {
		return nil, err
	}

	return &Service{authClient: authClient, firestoreClient: firestoreClient}, nil

}

func (s *Service) Authenticate(ctx context.Context, token string) (string, error) {
	verifiedToken, err := s.authClient.VerifyIDToken(ctx, token)
	if err != nil {
		return "", err
	}
	user, err := s.firestoreClient.Collection("users_info").Doc(verifiedToken.UID).Get(ctx)
	if err != nil {
		return "", err
	}
	projectId, err := user.DataAt("_project._id")
	projectIdString := fmt.Sprint(projectId)
	return projectIdString, nil
}

func (s *Service) GenerateUserToken(ctx context.Context, uid string) (string, error) {
	return s.authClient.CustomToken(ctx, uid)
}

func (s *Service) Close() error {
	if err := s.firestoreClient.Close(); err != nil {
		return fmt.Errorf("Error closing firestore client in authorization service: %v", err)
	}

	return nil
}

func (s *Service) IsAdmin(ctx context.Context, token string) (bool, error) {
	verifiedToken, err := s.authClient.VerifyIDToken(ctx, token)
	if err != nil {
		return false, err
	}
	user, err := s.firestoreClient.Collection("users_info").Doc(verifiedToken.UID).Get(ctx)
	if err != nil {
		return false, err
	}
	email, err := user.DataAt("_email")
	if err != nil {
		return false, err
	}
	emailString, ok := email.(string)
	if !ok {
		return false, fmt.Errorf("failed to parse [_email] field from user with token %s", token)
	}
	emailSplit := strings.Split(emailString, "@")
	if len(emailSplit) != 2 {
		return false, fmt.Errorf("invalid email string %s: should contain one '@' character", emailString)
	}
	return emailSplit[1] == "jitsu.com", nil
}

func HasAccessToProject(c *gin.Context, requestedProjectId string) bool {
	userProjectId, exists := c.Get("_project_id")
	if !exists || userProjectId != requestedProjectId {
		return false
	}
	return true
}
