package repository

import (
	"test-platform/internal/model"

	"gorm.io/gorm"
)

type ExecutionRepository struct {
	db *gorm.DB
}

func NewExecutionRepository(db *gorm.DB) *ExecutionRepository {
	return &ExecutionRepository{db: db}
}

// List returns paginated executions ordered by creation time (newest first).
func (r *ExecutionRepository) List(page, pageSize int) ([]model.Execution, int64, error) {
	var executions []model.Execution
	var total int64

	query := r.db.Model(&model.Execution{})

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&executions).Error

	if err != nil {
		return nil, 0, err
	}

	return executions, total, nil
}

// GetByID retrieves an execution by its ID with preloaded results.
func (r *ExecutionRepository) GetByID(id uint) (*model.Execution, error) {
	var execution model.Execution
	err := r.db.Preload("Results").First(&execution, id).Error
	if err != nil {
		return nil, err
	}
	return &execution, nil
}

// Create creates a new execution record.
func (r *ExecutionRepository) Create(execution *model.Execution) error {
	return r.db.Create(execution).Error
}

// Update updates an existing execution record.
func (r *ExecutionRepository) Update(execution *model.Execution) error {
	return r.db.Save(execution).Error
}

// CreateResult creates a new execution result record.
func (r *ExecutionRepository) CreateResult(result *model.ExecutionResult) error {
	return r.db.Create(result).Error
}
