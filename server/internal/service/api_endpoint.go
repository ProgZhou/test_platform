package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"test-platform/internal/model"
	"test-platform/internal/repository"
	"test-platform/pkg/validator"
	"time"

	"gorm.io/gorm"
)

// DebugResponse holds the result of an API debug call.
type DebugResponse struct {
	StatusCode int                 `json:"status_code"`
	Body       string              `json:"body"`
	Headers    map[string][]string `json:"headers"`
	Duration   int64               `json:"duration_ms"`
}

type APIService struct {
	repo   *repository.APIRepository
	parser *OpenAPIParser
	client *http.Client
}

func NewAPIService(repo *repository.APIRepository, parser *OpenAPIParser) *APIService {
	return &APIService{
		repo:   repo,
		parser: parser,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

// List returns a paginated list of APIs.
func (s *APIService) List(page, pageSize int) ([]model.TestAPI, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.List(page, pageSize)
}

// GetByID retrieves an API by its ID.
func (s *APIService) GetByID(id uint) (*model.TestAPI, error) {
	api, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("API not found")
		}
		return nil, err
	}
	return api, nil
}

// Create creates a new API with validation.
func (s *APIService) Create(api *model.TestAPI) error {
	// Validate basic fields
	api.Name = strings.TrimSpace(api.Name)
	if api.Name == "" {
		return errors.New("API name cannot be empty")
	}

	api.URL = strings.TrimSpace(api.URL)
	if api.URL == "" {
		return errors.New("API URL cannot be empty")
	}

	api.Method = strings.ToUpper(strings.TrimSpace(api.Method))
	if api.Method == "" {
		return errors.New("API method cannot be empty")
	}

	validMethods := map[string]bool{
		"GET": true, "POST": true, "PUT": true, "DELETE": true,
		"PATCH": true, "HEAD": true, "OPTIONS": true,
	}
	if !validMethods[api.Method] {
		return fmt.Errorf("invalid HTTP method: %s", api.Method)
	}

	// Validate parameters
	if err := s.validateParams(api.Params); err != nil {
		return err
	}

	return s.repo.Create(api)
}

// Update updates an existing API with validation.
func (s *APIService) Update(api *model.TestAPI) error {
	// Check if API exists
	existing, err := s.repo.GetByID(api.ID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("API not found")
		}
		return err
	}

	// Validate basic fields
	api.Name = strings.TrimSpace(api.Name)
	if api.Name == "" {
		return errors.New("API name cannot be empty")
	}

	api.URL = strings.TrimSpace(api.URL)
	if api.URL == "" {
		return errors.New("API URL cannot be empty")
	}

	api.Method = strings.ToUpper(strings.TrimSpace(api.Method))
	if api.Method == "" {
		return errors.New("API method cannot be empty")
	}

	validMethods := map[string]bool{
		"GET": true, "POST": true, "PUT": true, "DELETE": true,
		"PATCH": true, "HEAD": true, "OPTIONS": true,
	}
	if !validMethods[api.Method] {
		return fmt.Errorf("invalid HTTP method: %s", api.Method)
	}

	// Validate parameters
	if err := s.validateParams(api.Params); err != nil {
		return err
	}

	// Preserve timestamps
	api.CreatedAt = existing.CreatedAt

	return s.repo.Update(api)
}

// Delete deletes an API by its ID.
func (s *APIService) Delete(id uint) error {
	// Check if API exists
	_, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("API not found")
		}
		return err
	}

	return s.repo.Delete(id)
}

// ImportFromOpenAPI imports APIs from an OpenAPI document.
func (s *APIService) ImportFromOpenAPI(content, format string) ([]model.TestAPI, error) {
	if strings.TrimSpace(content) == "" {
		return nil, errors.New("content cannot be empty")
	}

	apis, err := s.parser.Parse(content, format)
	if err != nil {
		return nil, fmt.Errorf("failed to parse OpenAPI document: %w", err)
	}

	// Validate all APIs before creating
	for i := range apis {
		if err := s.validateParams(apis[i].Params); err != nil {
			return nil, fmt.Errorf("validation failed for API '%s': %w", apis[i].Name, err)
		}
	}

	// Create all APIs
	var createdAPIs []model.TestAPI
	for i := range apis {
		if err := s.repo.Create(&apis[i]); err != nil {
			return createdAPIs, fmt.Errorf("failed to create API '%s': %w", apis[i].Name, err)
		}
		createdAPIs = append(createdAPIs, apis[i])
	}

	return createdAPIs, nil
}

// Debug executes an API call with provided parameter values.
func (s *APIService) Debug(id uint, paramValues map[string]interface{}) (*DebugResponse, error) {
	// Get API definition
	api, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("API not found")
		}
		return nil, err
	}

	// Validate URL to prevent SSRF
	if err := s.validateDebugURL(api.URL); err != nil {
		return nil, err
	}

	// Build the request
	req, err := s.buildRequest(api, paramValues)
	if err != nil {
		return nil, fmt.Errorf("failed to build request: %w", err)
	}

	// Execute the request
	startTime := time.Now()
	resp, err := s.client.Do(req)
	duration := time.Since(startTime).Milliseconds()

	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return &DebugResponse{
		StatusCode: resp.StatusCode,
		Body:       string(bodyBytes),
		Headers:    resp.Header,
		Duration:   duration,
	}, nil
}

// validateDebugURL validates that the URL is safe for debug requests (prevents SSRF).
func (s *APIService) validateDebugURL(urlStr string) error {
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	// Whitelist allowed schemes
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return errors.New("only http/https schemes are allowed")
	}

	// Block private IP ranges and localhost
	host := parsedURL.Hostname()
	if host == "" {
		return errors.New("URL must have a valid hostname")
	}

	// Check for localhost
	if strings.ToLower(host) == "localhost" {
		return errors.New("requests to localhost are not allowed")
	}

	// Parse as IP and check for private ranges
	ip := net.ParseIP(host)
	if ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
			return errors.New("requests to private IP addresses are not allowed")
		}
	}

	return nil
}

// validateParams validates all parameters in a list.
func (s *APIService) validateParams(params []model.APIParam) error {
	for i, param := range params {
		// Validate parameter name
		if err := validator.ValidateParamName(param.Name); err != nil {
			return fmt.Errorf("parameter %d: %w", i+1, err)
		}

		// Validate parameter type
		validTypes := map[string]bool{
			"string": true, "bool": true, "int": true, "long": true,
			"float": true, "object": true, "array<string>": true,
			"array<int>": true, "array<long>": true, "array<float>": true,
			"array<object>": true,
		}
		if !validTypes[param.Type] {
			return fmt.Errorf("parameter %d (%s): invalid type '%s'", i+1, param.Name, param.Type)
		}

		// Validate parameter position
		validPositions := map[string]bool{
			"body": true, "header": true, "query": true, "path": true,
		}
		if !validPositions[param.Position] {
			return fmt.Errorf("parameter %d (%s): invalid position '%s'", i+1, param.Name, param.Position)
		}
	}
	return nil
}

// buildRequest constructs an HTTP request from API definition and parameter values.
func (s *APIService) buildRequest(api *model.TestAPI, paramValues map[string]interface{}) (*http.Request, error) {
	url := api.URL
	headers := make(map[string]string)
	var bodyData map[string]interface{}

	// Process parameters
	for _, param := range api.Params {
		value, exists := paramValues[param.Name]
		if !exists {
			if param.Required {
				return nil, fmt.Errorf("required parameter '%s' is missing", param.Name)
			}
			continue
		}

		switch param.Position {
		case "query":
			// Replace or append query parameters
			separator := "?"
			if strings.Contains(url, "?") {
				separator = "&"
			}
			url = fmt.Sprintf("%s%s%s=%v", url, separator, param.Name, value)

		case "header":
			// Sanitize header value to prevent header injection
			headerValue := fmt.Sprintf("%v", value)
			if strings.ContainsAny(headerValue, "\r\n") {
				return nil, fmt.Errorf("header value for '%s' contains invalid characters", param.Name)
			}
			headers[param.Name] = headerValue

		case "path":
			// Replace path parameters like {id} or :id
			url = strings.ReplaceAll(url, "{"+param.Name+"}", fmt.Sprintf("%v", value))
			url = strings.ReplaceAll(url, ":"+param.Name, fmt.Sprintf("%v", value))

		case "body":
			if bodyData == nil {
				bodyData = make(map[string]interface{})
			}
			bodyData[param.Name] = value
		}
	}

	// Create request
	var req *http.Request
	var err error

	if bodyData != nil {
		bodyBytes, err := json.Marshal(bodyData)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		req, err = http.NewRequest(api.Method, url, bytes.NewReader(bodyBytes))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, err = http.NewRequest(api.Method, url, nil)
		if err != nil {
			return nil, err
		}
	}

	// Set headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	return req, nil
}
