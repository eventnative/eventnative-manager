package auth

import (
	"context"
	"errors"
	"firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/spf13/viper"
	"google.golang.org/api/option"
	"log"
)

type Authenticator interface {
	Authenticate(ctx context.Context, token string) (string, error)
}

type FirebaseAuthenticator struct {
	Client *auth.Client
}

func (authenticator FirebaseAuthenticator) Authenticate(ctx context.Context, token string) (string, error) {
	verifiedToken, err := authenticator.Client.VerifyIDToken(ctx, token)
	if err != nil {
		return "", err
	}
	log.Printf("Verified ID token: %v\n", verifiedToken)
	return verifiedToken.UID, nil
}

func NewAuthenticator(authenticationViper *viper.Viper) (Authenticator, error) {
	if authenticationViper.IsSet("firebase") {
		ctx := context.Background()
		app, err := firebase.NewApp(context.Background(),
			&firebase.Config{ProjectID: authenticationViper.GetString("firebase.project_id")},
			option.WithAPIKey(authenticationViper.GetString("firebase.api_token")))
		if err != nil {
			return nil, err
		}
		client, err := app.Auth(ctx)
		if err != nil {
			return nil, err
		}
		return &FirebaseAuthenticator{Client: client}, nil
	} else {
		return nil, errors.New("auth is not set properly. Only firebase is supported now")
	}
}
