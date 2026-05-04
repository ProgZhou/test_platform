package repository

import (
	"test-platform/internal/model"

	"gorm.io/gorm"
)

type APIRepository struct {
	db *gorm.DB
}

func NewAPIRepository(db *gorm.DB) *APIRepository {
	return &APIRepository{db: db}
}

// List returns paginated list of APIs with their parameters preloaded.
func (r *APIRepository) List(page, pageSize int) ([]model.TestAPI, int64, error) {
	var apis []model.TestAPI
	var total int64

	// Count total records
	if err := r.db.Model(&model.TestAPI{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Calculate offset
	offset := (page - 1) * pageSize

	// Fetch paginated results with params preloaded
	err := r.db.
		Preload("Params", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		Order("id DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&apis).Error

	if err != nil {
		return nil, 0, err
	}

	return apis, total, nil
}

// GetByID retrieves an API by its ID with parameters preloaded.
func (r *APIRepository) GetByID(id uint) (*model.TestAPI, error) {
	var api model.TestAPI
	err := r.db.
		Preload("Params", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		First(&api, id).Error
	if err != nil {
		return nil, err
	}
	return &api, nil
}

// Create creates a new API with its parameters in a transaction.
func (r *APIRepository) Create(api *model.TestAPI) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Create the API
		if err := tx.Create(api).Error; err != nil {
			return err
		}
		return nil
	})
}

// Update updates an API and replaces its parameters in a transaction.
func (r *APIRepository) Update(api *model.TestAPI) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Delete existing parameters
		if err := tx.Where("api_id = ?", api.ID).Delete(&model.APIParam{}).Error; err != nil {
			return err
		}

		// Update API fields (excluding params)
		if err := tx.Model(&model.TestAPI{}).Where("id = ?", api.ID).Updates(map[string]interface{}{
			"name":        api.Name,
			"url":         api.URL,
			"method":      api.Method,
			"description": api.Description,
		}).Error; err != nil {
			return err
		}

		// Create new parameters if any
		if len(api.Params) > 0 {
			for i := range api.Params {
				api.Params[i].APIID = api.ID
			}
			if err := tx.Create(&api.Params).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// Delete deletes an API and cascades to its parameters.
func (r *APIRepository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Delete parameters first
		if err := tx.Where("api_id = ?", id).Delete(&model.APIParam{}).Error; err != nil {
			return err
		}

		// Delete the API
		if err := tx.Delete(&model.TestAPI{}, id).Error; err != nil {
			return err
		}

		return nil
	})
}
