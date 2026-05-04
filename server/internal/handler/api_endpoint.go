package handler

import (
	"net/http"
	"strconv"
	"test-platform/internal/model"
	"test-platform/internal/service"
	"test-platform/pkg/response"

	"github.com/gin-gonic/gin"
)

type APIHandler struct {
	service *service.APIService
}

func NewAPIHandler(service *service.APIService) *APIHandler {
	return &APIHandler{service: service}
}

type createAPIRequest struct {
	Name        string              `json:"name" binding:"required"`
	URL         string              `json:"url" binding:"required"`
	Method      string              `json:"method" binding:"required"`
	Description string              `json:"description"`
	Params      []apiParamRequest   `json:"params"`
}

type apiParamRequest struct {
	Name        string `json:"name" binding:"required"`
	Type        string `json:"type" binding:"required"`
	Description string `json:"description"`
	Required    bool   `json:"required"`
	Position    string `json:"position" binding:"required"`
	SortOrder   int    `json:"sort_order"`
}

type updateAPIRequest struct {
	Name        string              `json:"name" binding:"required"`
	URL         string              `json:"url" binding:"required"`
	Method      string              `json:"method" binding:"required"`
	Description string              `json:"description"`
	Params      []apiParamRequest   `json:"params"`
}

type importAPIRequest struct {
	Content string `json:"content" binding:"required"`
	Format  string `json:"format" binding:"required"`
}

type debugAPIRequest struct {
	ParamValues map[string]interface{} `json:"param_values"`
}

// List returns a paginated list of APIs.
func (h *APIHandler) List(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 20
	}

	apis, total, err := h.service.List(page, pageSize)
	if err != nil {
		response.InternalError(c, "failed to list APIs: "+err.Error())
		return
	}

	response.Success(c, response.PageData{
		Items: apis,
		Total: total,
	})
}

// Create creates a new API.
func (h *APIHandler) Create(c *gin.Context) {
	var req createAPIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	api := &model.TestAPI{
		Name:        req.Name,
		URL:         req.URL,
		Method:      req.Method,
		Description: req.Description,
	}

	// Convert params
	for _, p := range req.Params {
		api.Params = append(api.Params, model.APIParam{
			Name:        p.Name,
			Type:        p.Type,
			Description: p.Description,
			Required:    p.Required,
			Position:    p.Position,
			SortOrder:   p.SortOrder,
		})
	}

	if err := h.service.Create(api); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	c.JSON(http.StatusCreated, response.Response{
		Code:    0,
		Message: "success",
		Data:    api,
	})
}

// Update updates an existing API.
func (h *APIHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid API id")
		return
	}

	var req updateAPIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	api := &model.TestAPI{
		ID:          uint(id),
		Name:        req.Name,
		URL:         req.URL,
		Method:      req.Method,
		Description: req.Description,
	}

	// Convert params
	for _, p := range req.Params {
		api.Params = append(api.Params, model.APIParam{
			Name:        p.Name,
			Type:        p.Type,
			Description: p.Description,
			Required:    p.Required,
			Position:    p.Position,
			SortOrder:   p.SortOrder,
		})
	}

	if err := h.service.Update(api); err != nil {
		if err.Error() == "API not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, api)
}

// Delete deletes an API.
func (h *APIHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid API id")
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		if err.Error() == "API not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Import imports APIs from an OpenAPI document.
func (h *APIHandler) Import(c *gin.Context) {
	var req importAPIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	apis, err := h.service.ImportFromOpenAPI(req.Content, req.Format)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	c.JSON(http.StatusCreated, response.Response{
		Code:    0,
		Message: "success",
		Data:    map[string]interface{}{
			"imported_count": len(apis),
			"apis":           apis,
		},
	})
}

// Debug executes an API call with provided parameter values.
func (h *APIHandler) Debug(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid API id")
		return
	}

	var req debugAPIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	result, err := h.service.Debug(uint(id), req.ParamValues)
	if err != nil {
		if err.Error() == "API not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, result)
}
