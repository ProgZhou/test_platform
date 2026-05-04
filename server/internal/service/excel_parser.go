package service

import (
	"errors"
	"fmt"
	"strings"
	"test-platform/internal/model"

	"github.com/xuri/excelize/v2"
)

type ExcelParser struct{}

func NewExcelParser() *ExcelParser {
	return &ExcelParser{}
}

type ImportResult struct {
	SuccessCount int           `json:"success_count"`
	FailedCount  int           `json:"failed_count"`
	Errors       []ImportError `json:"errors,omitempty"`
}

type ImportError struct {
	Row     int    `json:"row"`
	Message string `json:"message"`
}

// ParseTestCases reads an Excel file and parses test cases from it.
// Expected columns: 用例名称, 前置条件, 操作步骤, 预期结果
// Returns valid test cases and any errors encountered per row.
func (p *ExcelParser) ParseTestCases(filePath string, folderID *uint) ([]model.TestCase, []ImportError, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open Excel file: %w", err)
	}
	defer f.Close()

	// Get the first sheet
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, nil, errors.New("Excel file has no sheets")
	}
	sheetName := sheets[0]

	// Read all rows
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read rows: %w", err)
	}

	if len(rows) == 0 {
		return nil, nil, errors.New("Excel file is empty")
	}

	// Parse header row to find column indices
	if len(rows) < 2 {
		return nil, nil, errors.New("Excel file must have at least a header row and one data row")
	}

	header := rows[0]
	colIndices := p.findColumnIndices(header)

	// Validate required columns exist
	if colIndices["name"] == -1 {
		return nil, nil, errors.New("required column '用例名称' not found")
	}
	if colIndices["steps"] == -1 {
		return nil, nil, errors.New("required column '操作步骤' not found")
	}
	if colIndices["expected"] == -1 {
		return nil, nil, errors.New("required column '预期结果' not found")
	}

	var validCases []model.TestCase
	var importErrors []ImportError

	// Parse data rows (skip header)
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		rowNum := i + 1 // Excel row number (1-based)

		// Skip empty rows
		if p.isEmptyRow(row) {
			continue
		}

		// Extract values
		name := p.getCellValue(row, colIndices["name"])
		precondition := p.getCellValue(row, colIndices["precondition"])
		steps := p.getCellValue(row, colIndices["steps"])
		expectedResult := p.getCellValue(row, colIndices["expected"])

		// Validate required fields
		var rowErrors []string
		if strings.TrimSpace(name) == "" {
			rowErrors = append(rowErrors, "用例名称不能为空")
		}
		if strings.TrimSpace(steps) == "" {
			rowErrors = append(rowErrors, "操作步骤不能为空")
		}
		if strings.TrimSpace(expectedResult) == "" {
			rowErrors = append(rowErrors, "预期结果不能为空")
		}

		if len(rowErrors) > 0 {
			importErrors = append(importErrors, ImportError{
				Row:     rowNum,
				Message: strings.Join(rowErrors, "; "),
			})
			continue
		}

		// Create valid test case
		testCase := model.TestCase{
			Name:           strings.TrimSpace(name),
			Precondition:   strings.TrimSpace(precondition),
			Steps:          strings.TrimSpace(steps),
			ExpectedResult: strings.TrimSpace(expectedResult),
			FolderID:       folderID,
		}

		validCases = append(validCases, testCase)
	}

	return validCases, importErrors, nil
}

// findColumnIndices maps Chinese column names to their indices.
func (p *ExcelParser) findColumnIndices(header []string) map[string]int {
	indices := map[string]int{
		"name":         -1,
		"precondition": -1,
		"steps":        -1,
		"expected":     -1,
	}

	for i, col := range header {
		col = strings.TrimSpace(col)
		switch col {
		case "用例名称":
			indices["name"] = i
		case "前置条件":
			indices["precondition"] = i
		case "操作步骤":
			indices["steps"] = i
		case "预期结果":
			indices["expected"] = i
		}
	}

	return indices
}

// getCellValue safely retrieves a cell value from a row.
func (p *ExcelParser) getCellValue(row []string, index int) string {
	if index < 0 || index >= len(row) {
		return ""
	}
	return row[index]
}

// isEmptyRow checks if a row is empty (all cells are blank).
func (p *ExcelParser) isEmptyRow(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}
