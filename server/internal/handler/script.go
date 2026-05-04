package handler

import (
	"io"
	"net/http"
	"strconv"
	"strings"
	"test-platform/internal/service"
	"test-platform/pkg/response"

	"github.com/gin-gonic/gin"
)

type ScriptHandler struct {
	service *service.ScriptService
}

func NewScriptHandler(service *service.ScriptService) *ScriptHandler {
	return &ScriptHandler{service: service}
}

type updateScriptRequest struct {
	Content string `json:"content" binding:"required"`
}

type runScriptResponse struct {
	Output   string  `json:"output"`
	Error    string  `json:"error,omitempty"`
	ExitCode int     `json:"exit_code"`
	Duration float64 `json:"duration_seconds"`
	TimedOut bool    `json:"timed_out"`
}

// List returns paginated test scripts, optionally filtered by folder.
func (h *ScriptHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	var folderID *uint
	if fid := c.Query("folder_id"); fid != "" {
		id, err := strconv.ParseUint(fid, 10, 64)
		if err != nil {
			response.BadRequest(c, "invalid folder_id")
			return
		}
		uid := uint(id)
		folderID = &uid
	}

	scripts, total, err := h.service.List(folderID, page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, response.PageData{
		Items: scripts,
		Total: total,
	})
}

// Upload handles multipart file upload for test scripts.
func (h *ScriptHandler) Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "file is required")
		return
	}
	defer file.Close()

	name := c.PostForm("name")
	if name == "" {
		name = header.Filename
	}

	language := c.PostForm("language")
	if language == "" {
		response.BadRequest(c, "language is required (go or python)")
		return
	}

	var folderID *uint
	if fid := c.PostForm("folder_id"); fid != "" {
		id, err := strconv.ParseUint(fid, 10, 64)
		if err != nil {
			response.BadRequest(c, "invalid folder_id")
			return
		}
		uid := uint(id)
		folderID = &uid
	}

	content, err := io.ReadAll(file)
	if err != nil {
		response.InternalError(c, "failed to read uploaded file")
		return
	}

	// Validate MIME type (should be text-based)
	mimeType := http.DetectContentType(content[:min(512, len(content))])
	if !isTextFile(mimeType) {
		response.BadRequest(c, "uploaded file does not appear to be a text file")
		return
	}

	script, err := h.service.Upload(name, language, content, folderID)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	c.JSON(http.StatusCreated, response.Response{
		Code:    0,
		Message: "success",
		Data:    script,
	})
}

// GetByID returns a single test script with its file content.
func (h *ScriptHandler) GetByID(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		response.BadRequest(c, "invalid script id")
		return
	}

	script, err := h.service.GetByID(id)
	if err != nil {
		if err.Error() == "script not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, script)
}

// Update updates the content of a test script.
func (h *ScriptHandler) Update(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		response.BadRequest(c, "invalid script id")
		return
	}

	var req updateScriptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	if err := h.service.Update(id, req.Content); err != nil {
		if err.Error() == "script not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete deletes a test script and its file.
func (h *ScriptHandler) Delete(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		response.BadRequest(c, "invalid script id")
		return
	}

	if err := h.service.Delete(id); err != nil {
		if err.Error() == "script not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Run executes a test script in a sandboxed Docker container.
func (h *ScriptHandler) Run(c *gin.Context) {
	id, err := parseIDParam(c)
	if err != nil {
		response.BadRequest(c, "invalid script id")
		return
	}

	result, err := h.service.Run(id)
	if err != nil {
		if err.Error() == "script not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, runScriptResponse{
		Output:   result.Output,
		Error:    result.Error,
		ExitCode: result.ExitCode,
		Duration: result.Duration.Seconds(),
		TimedOut: result.TimedOut,
	})
}

// parseIDParam extracts and validates the :id path parameter.
func parseIDParam(c *gin.Context) (uint, error) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}

// min returns the minimum of two integers.
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// isTextFile checks if the MIME type indicates a text file.
func isTextFile(mimeType string) bool {
	// Accept text files and common script MIME types
	textPrefixes := []string{
		"text/",
		"application/octet-stream", // Go and Python files may be detected as this
		"application/x-python",
		"application/x-go",
	}
	for _, prefix := range textPrefixes {
		if strings.HasPrefix(mimeType, prefix) || mimeType == prefix {
			return true
		}
	}
	return false
}