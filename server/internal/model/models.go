package model

import (
	"time"

	"gorm.io/gorm"
)

type Folder struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	ParentID  *uint          `gorm:"index" json:"parent_id"`
	Module    string         `gorm:"size:50;not null;index" json:"module"` // case or script
	SortOrder int            `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Children  []Folder       `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

type TestCase struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	FolderID       *uint          `gorm:"index" json:"folder_id"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	Precondition   string         `gorm:"type:text" json:"precondition"`
	Steps          string         `gorm:"type:text;not null" json:"steps"`
	ExpectedResult string         `gorm:"type:text;not null" json:"expected_result"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

type TestAPI struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	URL         string         `gorm:"size:500;not null" json:"url"`
	Method      string         `gorm:"size:10;not null" json:"method"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Params      []APIParam     `gorm:"foreignKey:APIID" json:"params,omitempty"`
}

type APIParam struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	APIID       uint   `gorm:"not null;index" json:"api_id"`
	Name        string `gorm:"size:255;not null" json:"name"`
	Type        string `gorm:"size:50;not null" json:"type"`
	Description string `gorm:"type:text" json:"description"`
	Required    bool   `gorm:"default:false" json:"required"`
	Position    string `gorm:"size:50;not null" json:"position"` // query, header, body, path
	SortOrder   int    `gorm:"default:0" json:"sort_order"`
}

type TestScript struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	FolderID  *uint          `gorm:"index" json:"folder_id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Language  string         `gorm:"size:50;not null" json:"language"` // go or python
	FilePath  string         `gorm:"size:500;not null" json:"file_path"`
	Content   string         `gorm:"type:text" json:"content"`
	FileSize  int64          `gorm:"default:0" json:"file_size"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Execution struct {
	ID           uint              `gorm:"primaryKey" json:"id"`
	ScriptID     uint              `gorm:"not null;index" json:"script_id"`
	Status       string            `gorm:"size:50;not null;index" json:"status"` // pending, running, completed, failed
	TotalCases   int               `gorm:"default:0" json:"total_cases"`
	PassedCases  int               `gorm:"default:0" json:"passed_cases"`
	FailedCases  int               `gorm:"default:0" json:"failed_cases"`
	TimeoutCases int               `gorm:"default:0" json:"timeout_cases"`
	StartedAt    *time.Time        `json:"started_at"`
	FinishedAt   *time.Time        `json:"finished_at"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
	DeletedAt    gorm.DeletedAt    `gorm:"index" json:"-"`
	Results      []ExecutionResult `gorm:"foreignKey:ExecutionID" json:"results,omitempty"`
}

type ExecutionResult struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	ExecutionID  uint      `gorm:"not null;index" json:"execution_id"`
	CaseID       uint      `gorm:"not null;index" json:"case_id"`
	Status       string    `gorm:"size:50;not null" json:"status"` // passed, failed, timeout, error
	Output       string    `gorm:"type:text" json:"output"`
	ErrorMessage string    `gorm:"type:text" json:"error_message"`
	DurationMs   int64     `gorm:"default:0" json:"duration_ms"`
	ExecutedAt   time.Time `json:"executed_at"`
}

type Report struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ExecutionID uint           `gorm:"not null;index" json:"execution_id"`
	FilePath    string         `gorm:"size:500;not null" json:"file_path"`
	Format      string         `gorm:"size:50;not null" json:"format"` // pdf or excel
	FileSize    int64          `gorm:"default:0" json:"file_size"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
