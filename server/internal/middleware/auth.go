package middleware

import (
	"os"
	"strings"
	"test-platform/pkg/response"

	"github.com/gin-gonic/gin"
)

// AuthRequired is a middleware that validates API key authentication.
// It checks for an Authorization header with format "Bearer {token}".
// The expected token is read from the API_KEY environment variable.
// If API_KEY is not set, authentication is skipped (for development).
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := os.Getenv("API_KEY")

		// Skip auth if API_KEY is not configured (development mode)
		if apiKey == "" {
			c.Next()
			return
		}

		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "missing authorization header")
			c.Abort()
			return
		}

		// Parse Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "invalid authorization header format")
			c.Abort()
			return
		}

		token := parts[1]
		if token != apiKey {
			response.Unauthorized(c, "invalid API key")
			c.Abort()
			return
		}

		c.Next()
	}
}
