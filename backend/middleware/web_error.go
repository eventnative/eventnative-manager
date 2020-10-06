package middleware

type WebErrorWrapper struct {
	Message string `json:"message"`
	Error   error  `json:"error"`
}
