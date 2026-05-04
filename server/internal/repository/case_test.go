package repository

import (
	"testing"
	"test-platform/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}

	// Migrate the schema
	if err := db.AutoMigrate(&model.TestCase{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	return db
}

func TestCaseRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCaseRepository(db)

	testCase := &model.TestCase{
		Name:           "Test Case 1",
		Precondition:   "Precondition",
		Steps:          "Step 1\nStep 2",
		ExpectedResult: "Expected result",
	}

	err := repo.Create(testCase)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if testCase.ID == 0 {
		t.Error("Expected ID to be set after create")
	}
}

func TestCaseRepository_List(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCaseRepository(db)

	// Create test cases
	for i := 1; i <= 5; i++ {
		testCase := &model.TestCase{
			Name:           "Test Case",
			Steps:          "Steps",
			ExpectedResult: "Result",
		}
		repo.Create(testCase)
	}

	// Test pagination
	cases, total, err := repo.List(nil, 1, 3)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if total != 5 {
		t.Errorf("Expected total 5, got %d", total)
	}

	if len(cases) != 3 {
		t.Errorf("Expected 3 cases, got %d", len(cases))
	}
}

func TestCaseRepository_BatchCreate(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCaseRepository(db)

	cases := []model.TestCase{
		{Name: "Case 1", Steps: "Steps 1", ExpectedResult: "Result 1"},
		{Name: "Case 2", Steps: "Steps 2", ExpectedResult: "Result 2"},
		{Name: "Case 3", Steps: "Steps 3", ExpectedResult: "Result 3"},
	}

	err := repo.BatchCreate(cases)
	if err != nil {
		t.Fatalf("BatchCreate failed: %v", err)
	}

	// Verify all were created
	allCases, total, err := repo.List(nil, 1, 10)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if total != 3 {
		t.Errorf("Expected 3 cases, got %d", total)
	}

	if len(allCases) != 3 {
		t.Errorf("Expected 3 cases in result, got %d", len(allCases))
	}
}
