package service

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"test-platform/internal/model"
	"test-platform/internal/repository"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
)

type ReportService struct {
	repo     *repository.ReportRepository
	execRepo *repository.ExecutionRepository
	storage  string
}

func NewReportService(
	repo *repository.ReportRepository,
	execRepo *repository.ExecutionRepository,
	storage string,
) *ReportService {
	return &ReportService{
		repo:     repo,
		execRepo: execRepo,
		storage:  storage,
	}
}

// Generate creates a report file for the given execution.
func (s *ReportService) Generate(executionID uint, format string) (*model.Report, error) {
	if format != "pdf" && format != "excel" {
		return nil, errors.New("format must be 'pdf' or 'excel'")
	}

	// Load execution with results
	execution, err := s.execRepo.GetByID(executionID)
	if err != nil {
		return nil, fmt.Errorf("execution not found: %w", err)
	}

	if execution.Status != "completed" && execution.Status != "failed" {
		return nil, errors.New("execution has not finished yet")
	}

	// Create reports directory
	reportsDir := filepath.Join(s.storage, "reports")
	if err := os.MkdirAll(reportsDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create reports directory: %w", err)
	}

	// Generate filename
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("%d_%s.%s", executionID, timestamp, format)
	if format == "excel" {
		filename = fmt.Sprintf("%d_%s.xlsx", executionID, timestamp)
	}
	filePath := filepath.Join(reportsDir, filename)

	// Generate report based on format
	var fileSize int64
	if format == "pdf" {
		fileSize, err = s.generatePDF(execution, filePath)
	} else {
		fileSize, err = s.generateExcel(execution, filePath)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to generate report: %w", err)
	}

	// Create report record
	report := &model.Report{
		ExecutionID: executionID,
		FilePath:    filePath,
		Format:      format,
		FileSize:    fileSize,
	}

	if err := s.repo.Create(report); err != nil {
		os.Remove(filePath) // Clean up file on error
		return nil, fmt.Errorf("failed to create report record: %w", err)
	}

	return report, nil
}

// generatePDF creates a PDF report.
func (s *ReportService) generatePDF(execution *model.Execution, filePath string) (int64, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Title
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "Test Execution Report")
	pdf.Ln(12)

	// Summary section
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "Summary")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(60, 8, "Execution ID:")
	pdf.Cell(0, 8, strconv.Itoa(int(execution.ID)))
	pdf.Ln(8)

	pdf.Cell(60, 8, "Script ID:")
	pdf.Cell(0, 8, strconv.Itoa(int(execution.ScriptID)))
	pdf.Ln(8)

	pdf.Cell(60, 8, "Status:")
	pdf.Cell(0, 8, execution.Status)
	pdf.Ln(8)

	pdf.Cell(60, 8, "Total Cases:")
	pdf.Cell(0, 8, strconv.Itoa(execution.TotalCases))
	pdf.Ln(8)

	pdf.Cell(60, 8, "Passed:")
	pdf.SetTextColor(0, 128, 0)
	pdf.Cell(0, 8, strconv.Itoa(execution.PassedCases))
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(8)

	pdf.Cell(60, 8, "Failed:")
	pdf.SetTextColor(255, 0, 0)
	pdf.Cell(0, 8, strconv.Itoa(execution.FailedCases))
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(8)

	pdf.Cell(60, 8, "Timeout:")
	pdf.SetTextColor(255, 165, 0)
	pdf.Cell(0, 8, strconv.Itoa(execution.TimeoutCases))
	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(12)

	// Results table
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(0, 10, "Test Results")
	pdf.Ln(10)

	// Table header
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(200, 200, 200)
	pdf.CellFormat(20, 8, "Case ID", "1", 0, "C", true, 0, "")
	pdf.CellFormat(50, 8, "Status", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 8, "Duration (ms)", "1", 0, "C", true, 0, "")
	pdf.CellFormat(90, 8, "Error Message", "1", 1, "C", true, 0, "")

	// Table rows
	pdf.SetFont("Arial", "", 9)
	for _, result := range execution.Results {
		pdf.CellFormat(20, 8, strconv.Itoa(int(result.CaseID)), "1", 0, "C", false, 0, "")

		// Color code status
		switch result.Status {
		case "passed":
			pdf.SetTextColor(0, 128, 0)
		case "failed":
			pdf.SetTextColor(255, 0, 0)
		case "timeout":
			pdf.SetTextColor(255, 165, 0)
		case "error":
			pdf.SetTextColor(255, 0, 0)
		}
		pdf.CellFormat(50, 8, result.Status, "1", 0, "C", false, 0, "")
		pdf.SetTextColor(0, 0, 0)

		pdf.CellFormat(30, 8, strconv.FormatInt(result.DurationMs, 10), "1", 0, "C", false, 0, "")

		// Truncate error message if too long
		errMsg := result.ErrorMessage
		if len(errMsg) > 50 {
			errMsg = errMsg[:47] + "..."
		}
		pdf.CellFormat(90, 8, errMsg, "1", 1, "L", false, 0, "")
	}

	// Save PDF
	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return 0, err
	}

	// Get file size
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return 0, err
	}

	return fileInfo.Size(), nil
}

// generateExcel creates an Excel report.
func (s *ReportService) generateExcel(execution *model.Execution, filePath string) (int64, error) {
	f := excelize.NewFile()
	defer f.Close()

	// Summary sheet
	summarySheet := "Summary"
	f.SetSheetName("Sheet1", summarySheet)

	// Write summary data
	f.SetCellValue(summarySheet, "A1", "Test Execution Report")
	f.SetCellValue(summarySheet, "A3", "Execution ID")
	f.SetCellValue(summarySheet, "B3", execution.ID)
	f.SetCellValue(summarySheet, "A4", "Script ID")
	f.SetCellValue(summarySheet, "B4", execution.ScriptID)
	f.SetCellValue(summarySheet, "A5", "Status")
	f.SetCellValue(summarySheet, "B5", execution.Status)
	f.SetCellValue(summarySheet, "A6", "Total Cases")
	f.SetCellValue(summarySheet, "B6", execution.TotalCases)
	f.SetCellValue(summarySheet, "A7", "Passed")
	f.SetCellValue(summarySheet, "B7", execution.PassedCases)
	f.SetCellValue(summarySheet, "A8", "Failed")
	f.SetCellValue(summarySheet, "B8", execution.FailedCases)
	f.SetCellValue(summarySheet, "A9", "Timeout")
	f.SetCellValue(summarySheet, "B9", execution.TimeoutCases)

	if execution.StartedAt != nil {
		f.SetCellValue(summarySheet, "A10", "Started At")
		f.SetCellValue(summarySheet, "B10", execution.StartedAt.Format("2006-01-02 15:04:05"))
	}
	if execution.FinishedAt != nil {
		f.SetCellValue(summarySheet, "A11", "Finished At")
		f.SetCellValue(summarySheet, "B11", execution.FinishedAt.Format("2006-01-02 15:04:05"))
	}

	// Style summary
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 16},
	})
	f.SetCellStyle(summarySheet, "A1", "A1", titleStyle)

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
	})
	f.SetCellStyle(summarySheet, "A3", "A11", headerStyle)

	// Set column widths
	f.SetColWidth(summarySheet, "A", "A", 20)
	f.SetColWidth(summarySheet, "B", "B", 30)

	// Details sheet
	detailsSheet := "Details"
	f.NewSheet(detailsSheet)

	// Write headers
	headers := []string{"Case ID", "Status", "Duration (ms)", "Output", "Error Message", "Executed At"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(detailsSheet, cell, header)
	}

	// Style headers
	headerStyleDetails, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#CCCCCC"}, Pattern: 1},
	})
	f.SetCellStyle(detailsSheet, "A1", "F1", headerStyleDetails)

	// Write results
	for i, result := range execution.Results {
		row := i + 2
		f.SetCellValue(detailsSheet, fmt.Sprintf("A%d", row), result.CaseID)
		f.SetCellValue(detailsSheet, fmt.Sprintf("B%d", row), result.Status)
		f.SetCellValue(detailsSheet, fmt.Sprintf("C%d", row), result.DurationMs)
		f.SetCellValue(detailsSheet, fmt.Sprintf("D%d", row), result.Output)
		f.SetCellValue(detailsSheet, fmt.Sprintf("E%d", row), result.ErrorMessage)
		f.SetCellValue(detailsSheet, fmt.Sprintf("F%d", row), result.ExecutedAt.Format("2006-01-02 15:04:05"))

		// Color code status
		var statusStyle int
		switch result.Status {
		case "passed":
			statusStyle, _ = f.NewStyle(&excelize.Style{
				Font: &excelize.Font{Color: "008000"},
			})
		case "failed":
			statusStyle, _ = f.NewStyle(&excelize.Style{
				Font: &excelize.Font{Color: "FF0000"},
			})
		case "timeout":
			statusStyle, _ = f.NewStyle(&excelize.Style{
				Font: &excelize.Font{Color: "FFA500"},
			})
		case "error":
			statusStyle, _ = f.NewStyle(&excelize.Style{
				Font: &excelize.Font{Color: "FF0000"},
			})
		}
		if statusStyle != 0 {
			f.SetCellStyle(detailsSheet, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), statusStyle)
		}
	}

	// Set column widths
	f.SetColWidth(detailsSheet, "A", "A", 10)
	f.SetColWidth(detailsSheet, "B", "B", 12)
	f.SetColWidth(detailsSheet, "C", "C", 15)
	f.SetColWidth(detailsSheet, "D", "D", 40)
	f.SetColWidth(detailsSheet, "E", "E", 40)
	f.SetColWidth(detailsSheet, "F", "F", 20)

	// Save Excel file
	if err := f.SaveAs(filePath); err != nil {
		return 0, err
	}

	// Get file size
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return 0, err
	}

	return fileInfo.Size(), nil
}

// List returns paginated reports.
func (s *ReportService) List(page, pageSize int) ([]model.Report, int64, error) {
	return s.repo.List(page, pageSize)
}

// GetByID retrieves a report by ID.
func (s *ReportService) GetByID(id uint) (*model.Report, error) {
	return s.repo.GetByID(id)
}

// GetFilePath returns the absolute file path for a report.
func (s *ReportService) GetFilePath(id uint) (string, error) {
	report, err := s.repo.GetByID(id)
	if err != nil {
		return "", fmt.Errorf("report not found: %w", err)
	}

	// Check if file exists
	if _, err := os.Stat(report.FilePath); os.IsNotExist(err) {
		return "", errors.New("report file not found on disk")
	}

	return report.FilePath, nil
}
