package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"test-platform/internal/service"
	"test-platform/pkg/response"
	"time"

	"github.com/gin-gonic/gin"
)

type CaseHandler struct {
	service *service.CaseService
}

func NewCaseHandler(service *service.CaseService) *CaseHandler {
	return &CaseHandler{service: service}
}

type createCaseRequest struct {
	Name           string `json:"name" binding:"required"`
	Precondition   string `json:"precondition"`
	Steps          string `json:"steps" binding:"required"`
	ExpectedResult string `json:"expected_result" binding:"required"`
	FolderID       *uint  `json:"folder_id"`
}

type updateCaseRequest struct {
	Name           string `json:"name" binding:"required"`
	Precondition   string `json:"precondition"`
	Steps          string `json:"steps" binding:"required"`
	ExpectedResult string `json:"expected_result" binding:"required"`
}

// List returns paginated test cases, optionally filtered by folder.
func (h *CaseHandler) List(c *gin.Context) {
	var folderID *uint
	if folderIDStr := c.Query("folder_id"); folderIDStr != "" {
		id, err := strconv.ParseUint(folderIDStr, 10, 64)
		if err != nil {
			response.BadRequest(c, "invalid folder_id")
			return
		}
		fid := uint(id)
		folderID = &fid
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	cases, total, err := h.service.List(folderID, page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, response.PageData{
		Items: cases,
		Total: total,
	})
}

// Create creates a new test case.
func (h *CaseHandler) Create(c *gin.Context) {
	var req createCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	testCase, err := h.service.Create(req.Name, req.Precondition, req.Steps, req.ExpectedResult, req.FolderID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	c.JSON(http.StatusCreated, response.Response{
		Code:    0,
		Message: "success",
		Data:    testCase,
	})
}

// Update updates an existing test case.
func (h *CaseHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid test case id")
		return
	}

	var req updateCaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	if err := h.service.Update(uint(id), req.Name, req.Precondition, req.Steps, req.ExpectedResult); err != nil {
		if err.Error() == "test case not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete deletes a test case.
func (h *CaseHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid test case id")
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		if err.Error() == "test case not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Import imports test cases from an Excel file.
func (h *CaseHandler) Import(c *gin.Context) {
	// Set max file size to 10MB
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 10<<20)

	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "file is required and must be less than 10MB")
		return
	}

	// Validate file extension
	ext := filepath.Ext(file.Filename)
	if ext != ".xlsx" && ext != ".xls" {
		response.BadRequest(c, "file must be an Excel file (.xlsx or .xls)")
		return
	}

	// Parse folder_id if provided
	var folderID *uint
	if folderIDStr := c.PostForm("folder_id"); folderIDStr != "" {
		id, err := strconv.ParseUint(folderIDStr, 10, 64)
		if err != nil {
			response.BadRequest(c, "invalid folder_id")
			return
		}
		fid := uint(id)
		folderID = &fid
	}

	// Create temp directory if it doesn't exist
	tempDir := filepath.Join(".", "temp")
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		response.InternalError(c, "failed to create temp directory")
		return
	}

	// Save uploaded file to temp location
	timestamp := time.Now().UnixNano()
	tempFilePath := filepath.Join(tempDir, fmt.Sprintf("import_%d%s", timestamp, ext))
	if err := c.SaveUploadedFile(file, tempFilePath); err != nil {
		response.InternalError(c, "failed to save uploaded file")
		return
	}

	// Clean up temp file after processing
	defer os.Remove(tempFilePath)

	// Validate MIME type
	f, err := os.Open(tempFilePath)
	if err != nil {
		response.InternalError(c, "failed to read uploaded file")
		return
	}
	defer f.Close()

	buffer := make([]byte, 512)
	_, err = f.Read(buffer)
	if err != nil {
		response.InternalError(c, "failed to read file header")
		return
	}

	mimeType := http.DetectContentType(buffer)
	validMimeTypes := []string{
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-excel",
		"application/zip", // .xlsx files are detected as zip
	}
	isValidMime := false
	for _, validType := range validMimeTypes {
		if mimeType == validType {
			isValidMime = true
			break
		}
	}
	if !isValidMime {
		response.BadRequest(c, "invalid Excel file format")
		return
	}

	// Import test cases
	result, err := h.service.ImportFromExcel(tempFilePath, folderID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, result)
}

// DownloadTemplate generates and downloads an Excel template.
func (h *CaseHandler) DownloadTemplate(c *gin.Context) {
	templateBytes, err := h.service.GenerateTemplate()
	if err != nil {
		response.InternalError(c, "failed to generate template")
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=test_case_template.xlsx")
	c.Header("Content-Length", strconv.Itoa(len(templateBytes)))

	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", templateBytes)
}
