package auth

import (
	"cloud.google.com/go/firestore"
	"context"
	"errors"
	"firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"fmt"
	"github.com/spf13/viper"
	"google.golang.org/api/option"
)

type Authenticator interface {
	Authenticate(ctx context.Context, token string) (string, error)
}

type FirebaseAuthenticator struct {
	AuthClient      *auth.Client
	FirestoreClient *firestore.Client
}

func (authenticator FirebaseAuthenticator) Authenticate(ctx context.Context, token string) (string, error) {
	verifiedToken, err := authenticator.AuthClient.VerifyIDToken(ctx, token)
	if err != nil {
		return "", err
	}
	user, err := authenticator.FirestoreClient.Collection("users_info").Doc(verifiedToken.UID).Get(ctx)
	if err != nil {
		return "", err
	}
	projectId, err := user.DataAt("_project._id")
	projectIdString := fmt.Sprint(projectId)
	return projectIdString, nil
}

func NewAuthenticator(authenticationViper *viper.Viper) (Authenticator, error) {
	if authenticationViper.IsSet("firebase") {
		ctx := context.Background()
		app, err := firebase.NewApp(context.Background(),
			&firebase.Config{ProjectID: authenticationViper.GetString("firebase.project_id")},
			option.WithCredentialsFile(authenticationViper.GetString("firebase.credentials_file")))
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
		return &FirebaseAuthenticator{AuthClient: authClient, FirestoreClient: firestoreClient}, nil
	} else {
		return nil, errors.New("auth is not set properly. Only firebase is supported now")
	}
}
