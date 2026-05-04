package service

import (
	"bytes"
	"errors"
	"fmt"
	"strings"
	"test-platform/internal/model"
	"test-platform/internal/repository"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type CaseService struct {
	repo   *repository.CaseRepository
	parser *ExcelParser
}

func NewCaseService(repo *repository.CaseRepository, parser *ExcelParser) *CaseService {
	return &CaseService{repo: repo, parser: parser}
}

// List returns paginated test cases, optionally filtered by folder.
func (s *CaseService) List(folderID *uint, page, pageSize int) ([]model.TestCase, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.List(folderID, page, pageSize)
}

// GetByID retrieves a test case by ID.
func (s *CaseService) GetByID(id uint) (*model.TestCase, error) {
	tc, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("test case not found")
		}
		return nil, err
	}
	return tc, nil
}

// Create creates a new test case with validation.
func (s *CaseService) Create(name, precondition, steps, expectedResult string, folderID *uint) (*model.TestCase, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("test case name cannot be empty")
	}

	steps = strings.TrimSpace(steps)
	if steps == "" {
		return nil, errors.New("steps cannot be empty")
	}

	expectedResult = strings.TrimSpace(expectedResult)
	if expectedResult == "" {
		return nil, errors.New("expected result cannot be empty")
	}

	testCase := &model.TestCase{
		Name:           name,
		Precondition:   strings.TrimSpace(precondition),
		Steps:          steps,
		ExpectedResult: expectedResult,
		FolderID:       folderID,
	}

	if err := s.repo.Create(testCase); err != nil {
		return nil, err
	}

	return testCase, nil
}

// Update updates an existing test case.
func (s *CaseService) Update(id uint, name, precondition, steps, expectedResult string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("test case name cannot be empty")
	}

	steps = strings.TrimSpace(steps)
	if steps == "" {
		return errors.New("steps cannot be empty")
	}

	expectedResult = strings.TrimSpace(expectedResult)
	if expectedResult == "" {
		return errors.New("expected result cannot be empty")
	}

	testCase, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("test case not found")
		}
		return err
	}

	testCase.Name = name
	testCase.Precondition = strings.TrimSpace(precondition)
	testCase.Steps = steps
	testCase.ExpectedResult = expectedResult

	return s.repo.Update(testCase)
}

// Delete deletes a test case by ID.
func (s *CaseService) Delete(id uint) error {
	_, err := s.repo.GetByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("test case not found")
		}
		return err
	}

	return s.repo.Delete(id)
}

// ImportFromExcel imports test cases from an Excel file.
// Returns detailed results including success count, failed count, and per-row errors.
func (s *CaseService) ImportFromExcel(filePath string, folderID *uint) (*ImportResult, error) {
	// Parse the Excel file
	validCases, parseErrors, err := s.parser.ParseTestCases(filePath, folderID)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Excel file: %w", err)
	}

	result := &ImportResult{
		SuccessCount: 0,
		FailedCount:  len(parseErrors),
		Errors:       parseErrors,
	}

	// Batch create valid cases
	if len(validCases) > 0 {
		if err := s.repo.BatchCreate(validCases); err != nil {
			return nil, fmt.Errorf("failed to save test cases: %w", err)
		}
		result.SuccessCount = len(validCases)
	}

	return result, nil
}

// GenerateTemplate generates an Excel template file with the required headers.
func (s *CaseService) GenerateTemplate() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Sheet1"

	// Set headers
	headers := []string{"用例名称", "前置条件", "操作步骤", "预期结果"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		if err := f.SetCellValue(sheetName, cell, header); err != nil {
			return nil, fmt.Errorf("failed to set header: %w", err)
		}
	}

	// Set column widths for better readability
	if err := f.SetColWidth(sheetName, "A", "A", 30); err != nil {
		return nil, err
	}
	if err := f.SetColWidth(sheetName, "B", "B", 40); err != nil {
		return nil, err
	}
	if err := f.SetColWidth(sheetName, "C", "C", 50); err != nil {
		return nil, err
	}
	if err := f.SetColWidth(sheetName, "D", "D", 50); err != nil {
		return nil, err
	}

	// Style the header row
	styleID, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold: true,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#E0E0E0"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create style: %w", err)
	}

	if err := f.SetCellStyle(sheetName, "A1", "D1", styleID); err != nil {
		return nil, fmt.Errorf("failed to set style: %w", err)
	}

	// Add example row
	exampleData := []interface{}{
		"示例：登录功能测试",
		"用户已注册且账号状态正常",
		"1. 打开登录页面\n2. 输入用户名和密码\n3. 点击登录按钮",
		"成功登录并跳转到首页",
	}
	for i, data := range exampleData {
		cell := fmt.Sprintf("%c2", 'A'+i)
		if err := f.SetCellValue(sheetName, cell, data); err != nil {
			return nil, fmt.Errorf("failed to set example data: %w", err)
		}
	}

	// Write to buffer
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("failed to write Excel file: %w", err)
	}

	return buf.Bytes(), nil
}
