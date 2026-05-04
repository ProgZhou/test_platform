package main

import (
	"fmt"
	"log"
	"os"

	"test-platform/internal/config"
	"test-platform/internal/middleware"
	"test-platform/internal/model"
	"test-platform/internal/router"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	cfg := config.Load()

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying DB: %v", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	err = db.AutoMigrate(
		&model.Folder{},
		&model.TestCase{},
		&model.TestAPI{},
		&model.APIParam{},
		&model.TestScript{},
		&model.Execution{},
		&model.ExecutionResult{},
		&model.Report{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate: %v", err)
	}

	storageDirs := []string{
		cfg.Storage.BasePath,
		cfg.Storage.BasePath + "/scripts",
		cfg.Storage.BasePath + "/reports",
	}
	for _, dir := range storageDirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("Failed to create storage directory %s: %v", dir, err)
		}
	}

	r := router.SetupRouter(db)
	r.Use(middleware.CORS())
	r.Use(middleware.ErrorHandler())

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
