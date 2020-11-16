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
	user, err := s.authClient.GetUserByEmail(ctx, uid)
	if err != nil {
		return "", err
	}
	return s.authClient.CustomToken(ctx, user.UID)
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
	uid := verifiedToken.UID
	authUserInfo, err := s.authClient.GetUser(ctx, uid)
	if err != nil {
		return false, fmt.Errorf("failed to get authorization data for user_id [%s]", uid)
	}
	// email domain validation
	email := authUserInfo.Email
	emailSplit := strings.Split(email, "@")
	if len(emailSplit) != 2 {
		return false, fmt.Errorf("invalid email string %s: should contain exactly one '@' character", email)
	}
	if emailSplit[1] != "jitsu.com" {
		return false, fmt.Errorf("domain %s is not allowed to use this API", emailSplit[1])
	}
	// authorization method validation
	isGoogleAuth := false
	for _, providerInfo := range authUserInfo.ProviderUserInfo {
		if providerInfo.ProviderID == "google.com" {
			isGoogleAuth = true
			break
		}
	}
	if !isGoogleAuth {
		return false, fmt.Errorf("only users with Google authorization have access to this API")
	}
	return true, nil
}

func HasAccessToProject(c *gin.Context, requestedProjectId string) bool {
	userProjectId, exists := c.Get("_project_id")
	if !exists || userProjectId != requestedProjectId {
		return false
	}
	return true
}
