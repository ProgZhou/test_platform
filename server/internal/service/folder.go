package service

import (
	"errors"
	"strings"
	"test-platform/internal/model"
	"test-platform/internal/repository"

	"gorm.io/gorm"
)

type FolderService struct {
	repo *repository.FolderRepository
}

func NewFolderService(repo *repository.FolderRepository) *FolderService {
	return &FolderService{repo: repo}
}

// GetTree retrieves the folder tree for a specific module.
func (s *FolderService) GetTree(module string) ([]model.Folder, error) {
	if module == "" {
		return nil, errors.New("module is required")
	}
	if module != "case" && module != "script" {
		return nil, errors.New("module must be 'case' or 'script'")
	}
	return s.repo.GetTree(module)
}

// Create creates a new folder with validation.
func (s *FolderService) Create(name string, parentID *uint, module string) (*model.Folder, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("folder name cannot be empty")
	}
	if module == "" {
		return nil, errors.New("module is required")
	}
	if module != "case" && module != "script" {
		return nil, errors.New("module must be 'case' or 'script'")
	}

	// Validate parent exists if provided
	if parentID != nil {
		parent, err := s.repo.GetByID(*parentID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("parent folder not found")
			}
			return nil, err
		}
		// Ensure parent is in the same module
		if parent.Module != module {
			return nil, errors.New("parent folder must be in the same module")
		}
	}

	folder := &model.Folder{
		Name:     name,
		ParentID: parentID,
		Module:   module,
	}

	if err := s.repo.Create(folder); err != nil {
		return nil, err
	}
	return folder, nil
}

// Rename renames a folder with validation.
func (s *FolderService) Rename(id uint, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("folder name cannot be empty")
	}

	folder, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("folder not found")
		}
		return err
	}

	folder.Name = name
	return s.repo.Update(folder)
}

// Delete deletes a folder and cascades to all children and related cases/scripts.
func (s *FolderService) Delete(id uint) error {
	// Check if folder exists
	_, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("folder not found")
		}
		return err
	}

	// Delete with cascade (handled in repository)
	return s.repo.Delete(id)
}
