package handler

import (
	"net/http"
	"strconv"
	"test-platform/internal/service"
	"test-platform/pkg/response"

	"github.com/gin-gonic/gin"
)

type FolderHandler struct {
	service *service.FolderService
}

func NewFolderHandler(service *service.FolderService) *FolderHandler {
	return &FolderHandler{service: service}
}

type createFolderRequest struct {
	Name     string `json:"name" binding:"required"`
	ParentID *uint  `json:"parent_id"`
	Module   string `json:"module" binding:"required"`
}

type updateFolderRequest struct {
	Name string `json:"name" binding:"required"`
}

// GetTree returns the folder tree for a given module.
func (h *FolderHandler) GetTree(c *gin.Context) {
	module := c.Query("module")
	if module == "" {
		response.BadRequest(c, "query parameter 'module' is required")
		return
	}

	tree, err := h.service.GetTree(module)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, tree)
}

// Create creates a new folder.
func (h *FolderHandler) Create(c *gin.Context) {
	var req createFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	folder, err := h.service.Create(req.Name, req.ParentID, req.Module)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	c.JSON(http.StatusCreated, response.Response{
		Code:    0,
		Message: "success",
		Data:    folder,
	})
}

// Update renames a folder.
func (h *FolderHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid folder id")
		return
	}

	var req updateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	if err := h.service.Rename(uint(id), req.Name); err != nil {
		if err.Error() == "folder not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

// Delete deletes a folder and all its descendants.
func (h *FolderHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid folder id")
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		if err.Error() == "folder not found" {
			response.NotFound(c, err.Error())
			return
		}
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, nil)
}
