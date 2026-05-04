package repository

import (
	"test-platform/internal/model"

	"gorm.io/gorm"
)

type CaseRepository struct {
	db *gorm.DB
}

func NewCaseRepository(db *gorm.DB) *CaseRepository {
	return &CaseRepository{db: db}
}

// List returns paginated test cases, optionally filtered by folder ID.
// If folderID is nil, returns all test cases.
func (r *CaseRepository) List(folderID *uint, page, pageSize int) ([]model.TestCase, int64, error) {
	var cases []model.TestCase
	var total int64

	query := r.db.Model(&model.TestCase{})

	if folderID != nil {
		query = query.Where("folder_id = ?", *folderID)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * pageSize
	if err := query.
		Order("id DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&cases).Error; err != nil {
		return nil, 0, err
	}

	return cases, total, nil
}

// GetByID retrieves a test case by its ID.
func (r *CaseRepository) GetByID(id uint) (*model.TestCase, error) {
	var testCase model.TestCase
	err := r.db.First(&testCase, id).Error
	if err != nil {
		return nil, err
	}
	return &testCase, nil
}

// Create creates a new test case.
func (r *CaseRepository) Create(testCase *model.TestCase) error {
	return r.db.Create(testCase).Error
}

// Update updates an existing test case.
func (r *CaseRepository) Update(testCase *model.TestCase) error {
	return r.db.Save(testCase).Error
}

// Delete deletes a test case by ID.
func (r *CaseRepository) Delete(id uint) error {
	return r.db.Delete(&model.TestCase{}, id).Error
}

// BatchCreate creates multiple test cases in a single transaction.
// This is used for Excel import functionality.
func (r *CaseRepository) BatchCreate(cases []model.TestCase) error {
	if len(cases) == 0 {
		return nil
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		// Create in batches of 100 to avoid overwhelming the database
		batchSize := 100
		for i := 0; i < len(cases); i += batchSize {
			end := i + batchSize
			if end > len(cases) {
				end = len(cases)
			}
			batch := cases[i:end]
			if err := tx.Create(&batch).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
