package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"test-platform/internal/model"

	"gopkg.in/yaml.v3"
)

type OpenAPIParser struct{}

func NewOpenAPIParser() *OpenAPIParser {
	return &OpenAPIParser{}
}

// openAPIDoc represents the top-level OpenAPI 3.x document.
type openAPIDoc struct {
	OpenAPI string                     `json:"openapi" yaml:"openapi"`
	Paths   map[string]openAPIPathItem `json:"paths" yaml:"paths"`
}

// openAPIPathItem represents a path item with HTTP methods.
type openAPIPathItem map[string]openAPIOperation

// openAPIOperation represents a single API operation.
type openAPIOperation struct {
	Summary     string              `json:"summary" yaml:"summary"`
	Description string              `json:"description" yaml:"description"`
	OperationID string              `json:"operationId" yaml:"operationId"`
	Parameters  []openAPIParameter  `json:"parameters" yaml:"parameters"`
	RequestBody *openAPIRequestBody `json:"requestBody" yaml:"requestBody"`
}

// openAPIParameter represents a query/header/path parameter.
type openAPIParameter struct {
	Name        string          `json:"name" yaml:"name"`
	In          string          `json:"in" yaml:"in"`
	Description string          `json:"description" yaml:"description"`
	Required    bool            `json:"required" yaml:"required"`
	Schema      openAPISchema   `json:"schema" yaml:"schema"`
}

// openAPIRequestBody represents the request body.
type openAPIRequestBody struct {
	Description string                       `json:"description" yaml:"description"`
	Required    bool                         `json:"required" yaml:"required"`
	Content     map[string]openAPIMediaType  `json:"content" yaml:"content"`
}

// openAPIMediaType represents a media type in content.
type openAPIMediaType struct {
	Schema openAPISchema `json:"schema" yaml:"schema"`
}

// openAPISchema represents a JSON Schema subset.
type openAPISchema struct {
	Type       string                   `json:"type" yaml:"type"`
	Format     string                   `json:"format" yaml:"format"`
	Properties map[string]openAPISchema `json:"properties" yaml:"properties"`
	Items      *openAPISchema           `json:"items" yaml:"items"`
	Required   []string                 `json:"required" yaml:"required"`
}

// Parse parses an OpenAPI 3.x document and returns TestAPI models.
func (p *OpenAPIParser) Parse(content string, format string) ([]model.TestAPI, error) {
	var doc openAPIDoc

	switch strings.ToLower(format) {
	case "json":
		if err := json.Unmarshal([]byte(content), &doc); err != nil {
			return nil, fmt.Errorf("failed to parse JSON: %w", err)
		}
	case "yaml", "yml":
		if err := yaml.Unmarshal([]byte(content), &doc); err != nil {
			return nil, fmt.Errorf("failed to parse YAML: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported format: %s, expected 'json' or 'yaml'", format)
	}

	if doc.Paths == nil {
		return nil, fmt.Errorf("no paths found in OpenAPI document")
	}

	var apis []model.TestAPI

	for path, pathItem := range doc.Paths {
		for method, operation := range pathItem {
			upperMethod := strings.ToUpper(method)
			// Skip non-HTTP methods (e.g., "parameters", "$ref")
			if !isHTTPMethod(upperMethod) {
				continue
			}

			apiName := operation.Summary
			if apiName == "" {
				apiName = operation.OperationID
			}
			if apiName == "" {
				apiName = fmt.Sprintf("%s %s", upperMethod, path)
			}

			api := model.TestAPI{
				Name:        apiName,
				URL:         path,
				Method:      upperMethod,
				Description: operation.Description,
			}

			var params []model.APIParam
			sortOrder := 0

			// Parse path/query/header parameters
			for _, param := range operation.Parameters {
				position := mapParamPosition(param.In)
				if position == "" {
					continue
				}
				params = append(params, model.APIParam{
					Name:        param.Name,
					Type:        mapSchemaType(param.Schema),
					Description: param.Description,
					Required:    param.Required,
					Position:    position,
					SortOrder:   sortOrder,
				})
				sortOrder++
			}

			// Parse request body properties as body params
			if operation.RequestBody != nil {
				for _, mediaType := range operation.RequestBody.Content {
					bodyParams := extractBodyParams(mediaType.Schema, operation.RequestBody.Required, sortOrder)
					params = append(params, bodyParams...)
					sortOrder += len(bodyParams)
					break // Only process the first content type
				}
			}

			api.Params = params
			apis = append(apis, api)
		}
	}

	if len(apis) == 0 {
		return nil, fmt.Errorf("no API operations found in OpenAPI document")
	}

	return apis, nil
}

// extractBodyParams extracts parameters from a request body schema.
func extractBodyParams(schema openAPISchema, bodyRequired bool, startOrder int) []model.APIParam {
	var params []model.APIParam

	if schema.Properties == nil {
		// If the body is a single value (e.g., array or primitive), treat as one param
		params = append(params, model.APIParam{
			Name:      "body",
			Type:      mapSchemaType(schema),
			Required:  bodyRequired,
			Position:  "body",
			SortOrder: startOrder,
		})
		return params
	}

	requiredSet := make(map[string]bool)
	for _, r := range schema.Required {
		requiredSet[r] = true
	}

	order := startOrder
	for propName, propSchema := range schema.Properties {
		params = append(params, model.APIParam{
			Name:      propName,
			Type:      mapSchemaType(propSchema),
			Required:  requiredSet[propName],
			Position:  "body",
			SortOrder: order,
		})
		order++
	}

	return params
}

// mapSchemaType converts OpenAPI schema type to our internal type system.
func mapSchemaType(schema openAPISchema) string {
	switch schema.Type {
	case "string":
		return "string"
	case "boolean":
		return "bool"
	case "integer":
		if schema.Format == "int64" {
			return "long"
		}
		return "int"
	case "number":
		return "float"
	case "object":
		return "object"
	case "array":
		if schema.Items != nil {
			itemType := mapSchemaType(*schema.Items)
			switch itemType {
			case "string":
				return "array<string>"
			case "int":
				return "array<int>"
			case "long":
				return "array<long>"
			case "float":
				return "array<float>"
			case "object":
				return "array<object>"
			default:
				return "array<string>"
			}
		}
		return "array<string>"
	default:
		return "string"
	}
}

// mapParamPosition maps OpenAPI "in" values to our position values.
func mapParamPosition(in string) string {
	switch in {
	case "query":
		return "query"
	case "header":
		return "header"
	case "path":
		return "path"
	case "cookie":
		return "header"
	default:
		return ""
	}
}

// isHTTPMethod checks if a string is a valid HTTP method.
func isHTTPMethod(method string) bool {
	switch method {
	case "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS":
		return true
	}
	return false
}
