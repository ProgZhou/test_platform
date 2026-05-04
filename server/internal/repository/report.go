package repository

import (
	"test-platform/internal/model"

	"gorm.io/gorm"
)

type ReportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

// List returns paginated reports ordered by creation time (newest first).
func (r *ReportRepository) List(page, pageSize int) ([]model.Report, int64, error) {
	var reports []model.Report
	var total int64

	query := r.db.Model(&model.Report{})

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&reports).Error

	if err != nil {
		return nil, 0, err
	}

	return reports, total, nil
}

// GetByID retrieves a report by its ID.
func (r *ReportRepository) GetByID(id uint) (*model.Report, error) {
	var report model.Report
	err := r.db.First(&report, id).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

// Create creates a new report record.
func (r *ReportRepository) Create(report *model.Report) error {
	return r.db.Create(report).Error
}
