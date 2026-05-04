package service

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"test-platform/internal/model"
	"test-platform/internal/repository"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	maxFileSize       = 10 * 1024 * 1024 // 10MB
	defaultRunTimeout = 5 * time.Minute
)

var supportedLanguages = map[string]string{
	"go":     ".go",
	"python": ".py",
}

type ScriptService struct {
	repo    *repository.ScriptRepository
	sandbox *SandboxService
	storage string
}

func NewScriptService(repo *repository.ScriptRepository, sandbox *SandboxService, storage string) *ScriptService {
	return &ScriptService{
		repo:    repo,
		sandbox: sandbox,
		storage: storage,
	}
}

// List retrieves test scripts with pagination.
func (s *ScriptService) List(folderID *uint, page, pageSize int) ([]model.TestScript, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.List(folderID, page, pageSize)
}

// GetByID retrieves a test script by ID and loads file content.
func (s *ScriptService) GetByID(id uint) (*model.TestScript, error) {
	script, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("script not found")
		}
		return nil, err
	}

	// Read file content from disk
	content, err := os.ReadFile(script.FilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read script file: %w", err)
	}
	script.Content = string(content)

	return script, nil
}

// Upload validates and saves a new test script.
func (s *ScriptService) Upload(name, language string, content []byte, folderID *uint) (*model.TestScript, error) {
	// Validate name
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("script name cannot be empty")
	}

	// Validate language
	ext, ok := supportedLanguages[language]
	if !ok {
		return nil, fmt.Errorf("unsupported language: %s (supported: go, python)", language)
	}

	// Validate file size
	if len(content) > maxFileSize {
		return nil, fmt.Errorf("file size exceeds maximum limit of 10MB")
	}

	if len(content) == 0 {
		return nil, errors.New("script content cannot be empty")
	}

	// Validate folder exists if provided
	if folderID != nil {
		// This would require folder repository, but we'll skip for now
		// In production, inject folder repository to validate
	}

	// Generate unique filename
	filename := uuid.New().String() + ext
	languageDir := filepath.Join(s.storage, "scripts", language)

	// Create language directory if not exists
	if err := os.MkdirAll(languageDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	filePath := filepath.Join(languageDir, filename)

	// Write file to disk
	if err := os.WriteFile(filePath, content, 0644); err != nil {
		return nil, fmt.Errorf("failed to write script file: %w", err)
	}

	// Create database record
	script := &model.TestScript{
		Name:     name,
		Language: language,
		FilePath: filePath,
		FileSize: int64(len(content)),
		FolderID: folderID,
	}

	if err := s.repo.Create(script); err != nil {
		// Cleanup file on database error
		os.Remove(filePath)
		return nil, fmt.Errorf("failed to create script record: %w", err)
	}

	return script, nil
}

// Update updates the content of an existing test script.
func (s *ScriptService) Update(id uint, content string) error {
	// Get existing script
	script, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("script not found")
		}
		return err
	}

	// Validate content size
	contentBytes := []byte(content)
	if len(contentBytes) > maxFileSize {
		return fmt.Errorf("file size exceeds maximum limit of 10MB")
	}

	if len(contentBytes) == 0 {
		return errors.New("script content cannot be empty")
	}

	// Update file on disk
	if err := os.WriteFile(script.FilePath, contentBytes, 0644); err != nil {
		return fmt.Errorf("failed to update script file: %w", err)
	}

	// Update database record
	script.FileSize = int64(len(contentBytes))
	if err := s.repo.Update(script); err != nil {
		return fmt.Errorf("failed to update script record: %w", err)
	}

	return nil
}

// Delete deletes a test script and its file from disk.
func (s *ScriptService) Delete(id uint) error {
	// Get script to get file path
	script, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("script not found")
		}
		return err
	}

	// Delete from database first
	if err := s.repo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete script record: %w", err)
	}

	// Delete file from disk (ignore error if file doesn't exist)
	if err := os.Remove(script.FilePath); err != nil && !os.IsNotExist(err) {
		// Log error but don't fail the operation
		fmt.Printf("Warning: failed to delete script file %s: %v\n", script.FilePath, err)
	}

	return nil
}

// Run executes a test script in a sandboxed environment.
func (s *ScriptService) Run(id uint) (*ExecutionResult, error) {
	// Get script
	script, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("script not found")
		}
		return nil, err
	}

	// Read script content
	content, err := os.ReadFile(script.FilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read script file: %w", err)
	}

	// Execute in sandbox
	result, err := s.sandbox.ExecuteScript(script.Language, string(content), defaultRunTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to execute script: %w", err)
	}

	return result, nil
}
