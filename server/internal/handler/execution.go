package handler

import (
	"net/http"
	"strconv"
	"test-platform/internal/service"
	"test-platform/pkg/response"

	"github.com/gin-gonic/gin"
)

type ExecutionHandler struct {
	service *service.ExecutionService
}

func NewExecutionHandler(svc *service.ExecutionService) *ExecutionHandler {
	return &ExecutionHandler{service: svc}
}

type createExecutionRequest struct {
	ScriptID uint   `json:"script_id" binding:"required"`
	CaseIDs  []uint `json:"case_ids" binding:"required,min=1"`
}

// List returns paginated executions.
func (h *ExecutionHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	executions, total, err := h.service.List(page, pageSize)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, response.PageData{
		Items: executions,
		Total: total,
	})
}

// Create starts a new test execution.
func (h *ExecutionHandler) Create(c *gin.Context) {
	var req createExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	execution, err := h.service.Create(req.ScriptID, req.CaseIDs)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	c.JSON(http.StatusCreated, response.Response{
		Code:    0,
		Message: "success",
		Data:    execution,
	})
}

// GetByID returns a single execution with its results.
func (h *ExecutionHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid execution id")
		return
	}

	execution, err := h.service.GetByID(uint(id))
	if err != nil {
		response.NotFound(c, "execution not found")
		return
	}

	response.Success(c, execution)
}
