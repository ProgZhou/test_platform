package repository

import (
	"test-platform/internal/model"

	"gorm.io/gorm"
)

type ScriptRepository struct {
	db *gorm.DB
}

func NewScriptRepository(db *gorm.DB) *ScriptRepository {
	return &ScriptRepository{db: db}
}

// List retrieves test scripts with pagination and optional folder filtering.
func (r *ScriptRepository) List(folderID *uint, page, pageSize int) ([]model.TestScript, int64, error) {
	var scripts []model.TestScript
	var total int64

	query := r.db.Model(&model.TestScript{})

	if folderID != nil {
		query = query.Where("folder_id = ?", *folderID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&scripts).Error

	if err != nil {
		return nil, 0, err
	}

	return scripts, total, nil
}

// GetByID retrieves a test script by its ID.
func (r *ScriptRepository) GetByID(id uint) (*model.TestScript, error) {
	var script model.TestScript
	err := r.db.First(&script, id).Error
	if err != nil {
		return nil, err
	}
	return &script, nil
}

// Create creates a new test script.
func (r *ScriptRepository) Create(script *model.TestScript) error {
	return r.db.Create(script).Error
}

// Update updates an existing test script.
func (r *ScriptRepository) Update(script *model.TestScript) error {
	return r.db.Save(script).Error
}

// Delete deletes a test script by ID.
func (r *ScriptRepository) Delete(id uint) error {
	return r.db.Delete(&model.TestScript{}, id).Error
}
