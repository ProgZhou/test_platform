package router

import (
	"os"
	"test-platform/internal/handler"
	"test-platform/internal/middleware"
	"test-platform/internal/repository"
	"test-platform/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handlers struct {
	FolderHandler    *handler.FolderHandler
	ScriptHandler    *handler.ScriptHandler
	APIHandler       *handler.APIHandler
	CaseHandler      *handler.CaseHandler
	ExecutionHandler *handler.ExecutionHandler
	ReportHandler    *handler.ReportHandler
}

func SetupRouter(db *gorm.DB) *gin.Engine {
	r := gin.Default()

	// Load configuration
	cfg := &struct {
		Storage struct {
			BasePath string
		}
	}{
		Storage: struct {
			BasePath string
		}{
			BasePath: "./storage",
		},
	}
	if storagePath := os.Getenv("STORAGE_PATH"); storagePath != "" {
		cfg.Storage.BasePath = storagePath
	}

	// Initialize folder dependencies
	folderRepo := repository.NewFolderRepository(db)
	folderService := service.NewFolderService(folderRepo)
	folderHandler := handler.NewFolderHandler(folderService)

	// Initialize script dependencies
	scriptRepo := repository.NewScriptRepository(db)
	sandboxService, err := service.NewSandboxService(cfg.Storage.BasePath)
	if err != nil {
		panic("Failed to initialize sandbox service: " + err.Error())
	}
	scriptService := service.NewScriptService(scriptRepo, sandboxService, cfg.Storage.BasePath)
	scriptHandler := handler.NewScriptHandler(scriptService)

	// Initialize API dependencies
	apiRepo := repository.NewAPIRepository(db)
	openAPIParser := service.NewOpenAPIParser()
	apiService := service.NewAPIService(apiRepo, openAPIParser)
	apiHandler := handler.NewAPIHandler(apiService)

	// Initialize case dependencies
	caseRepo := repository.NewCaseRepository(db)
	excelParser := service.NewExcelParser()
	caseService := service.NewCaseService(caseRepo, excelParser)
	caseHandler := handler.NewCaseHandler(caseService)

	// Initialize execution dependencies
	execRepo := repository.NewExecutionRepository(db)
	executionService := service.NewExecutionService(execRepo, caseRepo, scriptRepo, sandboxService)
	executionHandler := handler.NewExecutionHandler(executionService)

	// Initialize report dependencies
	reportRepo := repository.NewReportRepository(db)
	reportService := service.NewReportService(reportRepo, execRepo, cfg.Storage.BasePath)
	reportHandler := handler.NewReportHandler(reportService)

	handlers := &Handlers{
		FolderHandler:    folderHandler,
		ScriptHandler:    scriptHandler,
		APIHandler:       apiHandler,
		CaseHandler:      caseHandler,
		ExecutionHandler: executionHandler,
		ReportHandler:    reportHandler,
	}

	api := r.Group("/api/v1")
	api.Use(middleware.AuthRequired())
	{
		// Folder routes
		folders := api.Group("/folders")
		{
			folders.GET("", handlers.FolderHandler.GetTree)
			folders.POST("", handlers.FolderHandler.Create)
			folders.PUT("/:id", handlers.FolderHandler.Update)
			folders.DELETE("/:id", handlers.FolderHandler.Delete)
		}

		// Test case routes
		cases := api.Group("/cases")
		{
			cases.GET("", handlers.CaseHandler.List)
			cases.POST("", handlers.CaseHandler.Create)
			cases.PUT("/:id", handlers.CaseHandler.Update)
			cases.DELETE("/:id", handlers.CaseHandler.Delete)
			cases.POST("/import", handlers.CaseHandler.Import)
			cases.GET("/template", handlers.CaseHandler.DownloadTemplate)
		}

		// API routes
		apis := api.Group("/apis")
		{
			apis.GET("", handlers.APIHandler.List)
			apis.POST("", handlers.APIHandler.Create)
			apis.PUT("/:id", handlers.APIHandler.Update)
			apis.DELETE("/:id", handlers.APIHandler.Delete)
			apis.POST("/import", handlers.APIHandler.Import)
			apis.POST("/:id/debug", handlers.APIHandler.Debug)
		}

		// Script routes
		scripts := api.Group("/scripts")
		{
			scripts.GET("", handlers.ScriptHandler.List)
			scripts.POST("/upload", handlers.ScriptHandler.Upload)
			scripts.GET("/:id", handlers.ScriptHandler.GetByID)
			scripts.PUT("/:id", handlers.ScriptHandler.Update)
			scripts.DELETE("/:id", handlers.ScriptHandler.Delete)
			scripts.POST("/:id/run", handlers.ScriptHandler.Run)
		}

		// Execution routes
		executions := api.Group("/executions")
		{
			executions.GET("", handlers.ExecutionHandler.List)
			executions.POST("", handlers.ExecutionHandler.Create)
			executions.GET("/:id", handlers.ExecutionHandler.GetByID)
		}

		// Report routes
		reports := api.Group("/reports")
		{
			reports.GET("", handlers.ReportHandler.List)
			reports.POST("", handlers.ReportHandler.Generate)
			reports.GET("/:id", handlers.ReportHandler.GetByID)
			reports.GET("/:id/download", handlers.ReportHandler.Download)
		}
	}

	return r
}
