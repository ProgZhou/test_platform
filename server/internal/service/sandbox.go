package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type SandboxService struct {
	storagePath string
}

type ExecutionResult struct {
	Output   string
	Error    string
	ExitCode int
	Duration time.Duration
	TimedOut bool
}

func NewSandboxService(storagePath string) (*SandboxService, error) {
	// Validate storage path
	absPath, err := filepath.Abs(storagePath)
	if err != nil {
		return nil, fmt.Errorf("invalid storage path: %w", err)
	}

	// Ensure it's not a system directory
	systemDirs := []string{"/etc", "/sys", "/proc", "/dev", "/root", "/boot"}
	for _, sysDir := range systemDirs {
		if strings.HasPrefix(absPath, sysDir) {
			return nil, errors.New("storage path cannot be a system directory")
		}
	}

	// Check if docker is available
	cmd := exec.Command("docker", "version")
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("docker is not available: %w", err)
	}

	return &SandboxService{
		storagePath: absPath,
	}, nil
}

// ExecuteScript executes a script in a sandboxed Docker container.
func (s *SandboxService) ExecuteScript(language, content string, timeout time.Duration) (*ExecutionResult, error) {
	startTime := time.Now()

	// Determine file extension and Docker image
	var ext, dockerImage, cmd string
	switch language {
	case "go":
		ext = ".go"
		dockerImage = "golang:1.22-alpine"
		cmd = "go run /script/main.go"
	case "python":
		ext = ".py"
		dockerImage = "python:3.12-slim"
		cmd = "python /script/main.py"
	default:
		return nil, fmt.Errorf("unsupported language: %s", language)
	}

	// Create temporary directory for script
	tempDir := filepath.Join(s.storagePath, "temp", uuid.New().String())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Write script content to file
	scriptPath := filepath.Join(tempDir, "main"+ext)
	if err := os.WriteFile(scriptPath, []byte(content), 0644); err != nil {
		return nil, fmt.Errorf("failed to write script file: %w", err)
	}

	// Pull Docker image if not exists
	if err := s.ensureImage(dockerImage); err != nil {
		return nil, fmt.Errorf("failed to ensure docker image: %w", err)
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Build docker run command
	dockerCmd := exec.CommandContext(ctx,
		"docker", "run",
		"--rm",
		"--cpus", "1",
		"--memory", "512m",
		"--network", "none",
		"--security-opt", "no-new-privileges",
		"--cap-drop", "ALL",
		"--user", "nobody:nogroup",
		"-v", fmt.Sprintf("%s:/script:ro", tempDir),
		dockerImage,
		"sh", "-c", cmd,
	)

	var stdout, stderr bytes.Buffer
	dockerCmd.Stdout = &stdout
	dockerCmd.Stderr = &stderr

	// Execute command
	err := dockerCmd.Run()
	duration := time.Since(startTime)

	exitCode := 0
	timedOut := false

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			timedOut = true
			exitCode = 124 // Standard timeout exit code
		} else if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			return nil, fmt.Errorf("failed to execute docker command: %w", err)
		}
	}

	return &ExecutionResult{
		Output:   stdout.String(),
		Error:    stderr.String(),
		ExitCode: exitCode,
		Duration: duration,
		TimedOut: timedOut,
	}, nil
}

// ensureImage pulls the Docker image if it doesn't exist locally.
func (s *SandboxService) ensureImage(imageName string) error {
	// Check if image exists
	cmd := exec.Command("docker", "image", "inspect", imageName)
	if err := cmd.Run(); err == nil {
		return nil // Image already exists
	}

	// Pull image with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	cmd = exec.CommandContext(ctx, "docker", "pull", imageName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to pull image %s: %w\n%s", imageName, err, string(output))
	}

	return nil
}

// Close is a no-op for CLI-based implementation.
func (s *SandboxService) Close() error {
	return nil
}
