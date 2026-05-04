package service

import (
	"errors"
	"fmt"
	"log"
	"os"
	"test-platform/internal/model"
	"test-platform/internal/repository"
	"time"
)

type ExecutionService struct {
	execRepo   *repository.ExecutionRepository
	caseRepo   *repository.CaseRepository
	scriptRepo *repository.ScriptRepository
	sandbox    *SandboxService
}

func NewExecutionService(
	execRepo *repository.ExecutionRepository,
	caseRepo *repository.CaseRepository,
	scriptRepo *repository.ScriptRepository,
	sandbox *SandboxService,
) *ExecutionService {
	return &ExecutionService{
		execRepo:   execRepo,
		caseRepo:   caseRepo,
		scriptRepo: scriptRepo,
		sandbox:    sandbox,
	}
}

// Create validates inputs, creates an execution record, and starts async execution.
func (s *ExecutionService) Create(scriptID uint, caseIDs []uint) (*model.Execution, error) {
	if len(caseIDs) == 0 {
		return nil, errors.New("case_ids must not be empty")
	}

	// Validate script exists
	script, err := s.scriptRepo.GetByID(scriptID)
	if err != nil {
		return nil, fmt.Errorf("script not found: %w", err)
	}
	_ = script

	// Validate all cases exist
	for _, caseID := range caseIDs {
		if _, err := s.caseRepo.GetByID(caseID); err != nil {
			return nil, fmt.Errorf("test case %d not found: %w", caseID, err)
		}
	}

	// Create execution record with pending status
	execution := &model.Execution{
		ScriptID:     scriptID,
		Status:       "pending",
		TotalCases:   len(caseIDs),
		PassedCases:  0,
		FailedCases:  0,
		TimeoutCases: 0,
	}

	if err := s.execRepo.Create(execution); err != nil {
		return nil, fmt.Errorf("failed to create execution: %w", err)
	}

	// Start async execution in background goroutine
	go s.executeAsync(execution.ID, scriptID, caseIDs)

	return execution, nil
}

// executeAsync runs the execution asynchronously in the background.
func (s *ExecutionService) executeAsync(executionID uint, scriptID uint, caseIDs []uint) {
	// Update status to running
	execution, err := s.execRepo.GetByID(executionID)
	if err != nil {
		log.Printf("Failed to get execution %d: %v", executionID, err)
		return
	}

	now := time.Now()
	execution.Status = "running"
	execution.StartedAt = &now
	if err := s.execRepo.Update(execution); err != nil {
		log.Printf("Failed to update execution %d to running: %v", executionID, err)
		return
	}

	// Load script
	script, err := s.scriptRepo.GetByID(scriptID)
	if err != nil {
		log.Printf("Failed to load script %d: %v", scriptID, err)
		s.markExecutionFailed(executionID)
		return
	}

	// Read script content from disk
	scriptContent, err := os.ReadFile(script.FilePath)
	if err != nil {
		log.Printf("Failed to read script file %s: %v", script.FilePath, err)
		s.markExecutionFailed(executionID)
		return
	}

	// Execute each test case
	for _, caseID := range caseIDs {
		testCase, err := s.caseRepo.GetByID(caseID)
		if err != nil {
			log.Printf("Failed to load test case %d: %v", caseID, err)
			continue
		}

		// Execute script in sandbox with 5-minute timeout
		startTime := time.Now()
		result, err := s.sandbox.ExecuteScript(script.Language, string(scriptContent), 5*time.Minute)
		duration := time.Since(startTime)

		// Create execution result
		execResult := &model.ExecutionResult{
			ExecutionID: executionID,
			CaseID:      caseID,
			DurationMs:  duration.Milliseconds(),
			ExecutedAt:  time.Now(),
		}

		if err != nil {
			execResult.Status = "error"
			execResult.ErrorMessage = err.Error()
			execution.FailedCases++
		} else if result.TimedOut {
			execResult.Status = "timeout"
			execResult.ErrorMessage = "Execution timed out after 5 minutes"
			execution.TimeoutCases++
		} else if result.ExitCode != 0 {
			execResult.Status = "failed"
			execResult.Output = result.Output
			execResult.ErrorMessage = result.Error
			execution.FailedCases++
		} else {
			execResult.Status = "passed"
			execResult.Output = result.Output
			execution.PassedCases++
		}

		// Save execution result
		if err := s.execRepo.CreateResult(execResult); err != nil {
			log.Printf("Failed to save execution result for case %d: %v", caseID, err)
		}

		// Update execution counters
		if err := s.execRepo.Update(execution); err != nil {
			log.Printf("Failed to update execution counters: %v", err)
		}

		_ = testCase
	}

	// Mark execution as completed
	finishedAt := time.Now()
	execution.Status = "completed"
	execution.FinishedAt = &finishedAt
	if err := s.execRepo.Update(execution); err != nil {
		log.Printf("Failed to mark execution %d as completed: %v", executionID, err)
	}
}

// markExecutionFailed marks an execution as failed.
func (s *ExecutionService) markExecutionFailed(executionID uint) {
	execution, err := s.execRepo.GetByID(executionID)
	if err != nil {
		log.Printf("Failed to get execution %d: %v", executionID, err)
		return
	}

	finishedAt := time.Now()
	execution.Status = "failed"
	execution.FinishedAt = &finishedAt
	if err := s.execRepo.Update(execution); err != nil {
		log.Printf("Failed to mark execution %d as failed: %v", executionID, err)
	}
}

// List returns paginated executions.
func (s *ExecutionService) List(page, pageSize int) ([]model.Execution, int64, error) {
	return s.execRepo.List(page, pageSize)
}

// GetByID retrieves an execution by ID with results.
func (s *ExecutionService) GetByID(id uint) (*model.Execution, error) {
	return s.execRepo.GetByID(id)
}
