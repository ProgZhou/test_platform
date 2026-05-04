package validator

import (
	"regexp"
)

var paramNameRegex = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

func IsValidParamName(name string) bool {
	if name == "" {
		return false
	}
	return paramNameRegex.MatchString(name)
}

func ValidateParamName(name string) error {
	if !IsValidParamName(name) {
		return &ValidationError{
			Field:   "name",
			Message: "Parameter name must start with a letter or underscore and contain only letters, numbers, and underscores",
		}
	}
	return nil
}

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}
