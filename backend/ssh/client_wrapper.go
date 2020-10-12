package ssh

import (
	"github.com/bramvdbogaerde/go-scp"
	"github.com/bramvdbogaerde/go-scp/auth"
	"golang.org/x/crypto/ssh"
	"os"
)

type ClientWrapper struct {
	client *scp.Client
}

func (clientWrapper *ClientWrapper) CopyFile(sourceFilePath string, targetFilePath string) error {
	f, _ := os.Open(sourceFilePath)
	defer f.Close()
	err := clientWrapper.client.CopyFile(f, targetFilePath, "0440")
	if err != nil {
		return err
	}
	return nil
}

func NewSshClient(host string, privateKeyPath string, user string) (*ClientWrapper, error) {
	clientConfig, _ := auth.PrivateKey(user, privateKeyPath, ssh.InsecureIgnoreHostKey())
	client := scp.NewClient(host, &clientConfig)
	err := client.Connect()
	if err != nil {
		return nil, err
	}
	return &ClientWrapper{client: &client}, nil
}

func (clientWrapper *ClientWrapper) Close() {
	if clientWrapper.client != nil {
		clientWrapper.client.Close()
	}
}
