package repository

import (
	"test-platform/internal/model"

	"gorm.io/gorm"
)

type FolderRepository struct {
	db *gorm.DB
}

func NewFolderRepository(db *gorm.DB) *FolderRepository {
	return &FolderRepository{db: db}
}

// GetTree returns all folders for a module with children populated recursively.
func (r *FolderRepository) GetTree(module string) ([]model.Folder, error) {
	var roots []model.Folder
	err := r.db.
		Where("module = ? AND parent_id IS NULL", module).
		Order("sort_order ASC, id ASC").
		Find(&roots).Error
	if err != nil {
		return nil, err
	}
	for i := range roots {
		if err := r.loadChildren(r.db, &roots[i]); err != nil {
			return nil, err
		}
	}
	return roots, nil
}

// loadChildren recursively loads child folders.
func (r *FolderRepository) loadChildren(db *gorm.DB, folder *model.Folder) error {
	var children []model.Folder
	err := db.
		Where("parent_id = ?", folder.ID).
		Order("sort_order ASC, id ASC").
		Find(&children).Error
	if err != nil {
		return err
	}
	for i := range children {
		if err := r.loadChildren(db, &children[i]); err != nil {
			return err
		}
	}
	folder.Children = children
	return nil
}

// GetByID retrieves a folder by its ID.
func (r *FolderRepository) GetByID(id uint) (*model.Folder, error) {
	var folder model.Folder
	err := r.db.First(&folder, id).Error
	if err != nil {
		return nil, err
	}
	return &folder, nil
}

// Create creates a new folder.
func (r *FolderRepository) Create(folder *model.Folder) error {
	return r.db.Create(folder).Error
}

// Update updates an existing folder.
func (r *FolderRepository) Update(folder *model.Folder) error {
	return r.db.Save(folder).Error
}

// Delete deletes a folder and cascades to all children and related cases/scripts.
func (r *FolderRepository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Get all descendant folder IDs
		descendantIDs, err := r.getDescendantIDs(tx, id)
		if err != nil {
			return err
		}
		allIDs := append([]uint{id}, descendantIDs...)

		// Delete related test cases
		if err := tx.Where("folder_id IN ?", allIDs).Delete(&model.TestCase{}).Error; err != nil {
			return err
		}

		// Delete related test scripts
		if err := tx.Where("folder_id IN ?", allIDs).Delete(&model.TestScript{}).Error; err != nil {
			return err
		}

		// Delete all descendant folders
		if len(descendantIDs) > 0 {
			if err := tx.Delete(&model.Folder{}, descendantIDs).Error; err != nil {
				return err
			}
		}

		// Delete the folder itself
		return tx.Delete(&model.Folder{}, id).Error
	})
}

// getDescendantIDs recursively gets all descendant folder IDs.
func (r *FolderRepository) getDescendantIDs(tx *gorm.DB, parentID uint) ([]uint, error) {
	var children []model.Folder
	if err := tx.Where("parent_id = ?", parentID).Find(&children).Error; err != nil {
		return nil, err
	}

	var allIDs []uint
	for _, child := range children {
		allIDs = append(allIDs, child.ID)
		descendantIDs, err := r.getDescendantIDs(tx, child.ID)
		if err != nil {
			return nil, err
		}
		allIDs = append(allIDs, descendantIDs...)
	}
	return allIDs, nil
}

// HasChildren checks if a folder has any children.
func (r *FolderRepository) HasChildren(id uint) (bool, error) {
	var count int64
	err := r.db.Model(&model.Folder{}).Where("parent_id = ?", id).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
