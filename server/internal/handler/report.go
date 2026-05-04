package handler

import (
	"net/http"
	"path/filepath"
	"strconv"
	"test-platform/internal/service"
	"test-platform/pkg/response"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	service *service.ReportService
}

func NewReportHandler(svc *service.ReportService) *ReportHandler {
	return &ReportHandler{service: svc}
}

type generateReportRequest struct {
	ExecutionID uint   `json:"execution_id" binding:"required"`
	Format      string `json:"format" binding:"required,oneof=pdf excel"`
}

// List returns paginated reports.
func (h *ReportHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	reports, total, err := h.service.List(page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, response.PageData{
		Items: reports,
		Total: total,
	})
}

// GetByID returns a single report.
func (h *ReportHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid report id")
		return
	}

	report, err := h.service.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "report not found")
		return
	}

	response.Success(c, report)
}

// Download serves the report file for download.
func (h *ReportHandler) Download(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid report id")
		return
	}

	filePath, err := h.service.GetFilePath(uint(id))
	if err != nil {
		response.NotFound(c, err.Error())
		return
	}

	// Determine content type based on file extension
	ext := filepath.Ext(filePath)
	var contentType string
	switch ext {
	case ".pdf":
		contentType = "application/pdf"
	case ".xlsx":
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	default:
		contentType = "application/octet-stream"
	}

	filename := filepath.Base(filePath)
	c.Header("Content-Type", contentType)
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.File(filePath)
}

// Generate creates a new report for an execution.
func (h *ReportHandler) Generate(c *gin.Context) {
	var req generateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	report, err := h.service.Generate(req.ExecutionID, req.Format)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	c.JSON(http.StatusCreated, response.Response{
		Code:    0,
		Message: "success",
		Data:    report,
	})
}
