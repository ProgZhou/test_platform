# Code Review Report: test-platform-v1-20260406

**Reviewer**: Code Review Agent  
**Review Date**: 2026-04-25  
**Scope**: Backend (server/) and Frontend (web/)

---

## CRITICAL Issues

### 1. **API Debug Proxy: SSRF Vulnerability**
**File**: `server/internal/service/api_endpoint.go:189-227`  
**Issue**: The `Debug()` method accepts arbitrary URLs from user input and makes HTTP requests without validation. This allows Server-Side Request Forgery (SSRF) attacks to internal services, cloud metadata endpoints (169.254.169.254), or localhost.

**Risk**: Attacker can probe internal network, access AWS metadata, or bypass firewall restrictions.

**Fix**:
```go
// Add URL validation before buildRequest
func (s *APIService) Debug(id uint, paramValues map[string]interface{}) (*DebugResponse, error) {
    api, err := s.repo.GetByID(id)
    if err != nil {
        return nil, errors.New("API not found")
    }
    
    // Validate URL scheme and host
    parsedURL, err := url.Parse(api.URL)
    if err != nil {
        return nil, fmt.Errorf("invalid URL: %w", err)
    }
    
    // Whitelist allowed schemes
    if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
        return nil, errors.New("only http/https schemes are allowed")
    }
    
    // Block private IP ranges and localhost
    host := parsedURL.Hostname()
    if isPrivateOrLocalhost(host) {
        return nil, errors.New("requests to private IPs or localhost are not allowed")
    }
    
    // Continue with buildRequest...
}

func isPrivateOrLocalhost(host string) bool {
    ip := net.ParseIP(host)
    if ip == nil {
        // If not an IP, check for localhost hostname
        if strings.ToLower(host) == "localhost" {
            return true
        }
        return false
    }
    return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast()
}
```

---

### 2. **Docker Sandbox: Missing Privilege Drop and Security Options**
**File**: `server/internal/service/sandbox.go:81-90`  
**Issue**: Docker container runs without explicit `--security-opt no-new-privileges`, `--cap-drop=ALL`, or `--user` flag. Container may run as root with elevated capabilities.

**Risk**: Container escape, privilege escalation, or kernel exploits.

**Fix**:
```go
dockerCmd := exec.CommandContext(ctx,
    "docker", "run",
    "--rm",
    "--cpus", "1",
    "--memory", "512m",
    "--network", "none",
    "--security-opt", "no-new-privileges",
    "--cap-drop", "ALL",
    "--read-only",  // Already implied by :ro mount, but explicit is better
    "--user", "nobody:nogroup",  // Run as non-root user
    "-v", fmt.Sprintf("%s:/script:ro", tempDir),
    dockerImage,
    "sh", "-c", cmd,
)
```

---

### 3. **Docker Sandbox: Volume Mount Path Traversal Risk**
**File**: `server/internal/service/sandbox.go:59-69`  
**Issue**: `tempDir` is constructed using `uuid.New().String()` which is safe, but if `storagePath` is user-controlled or misconfigured, it could lead to mounting sensitive host directories.

**Risk**: Exposure of host filesystem to container.

**Fix**: Validate `storagePath` at initialization:
```go
func NewSandboxService(storagePath string) (*SandboxService, error) {
    // Validate storage path is absolute and within expected directory
    absPath, err := filepath.Abs(storagePath)
    if err != nil {
        return nil, fmt.Errorf("invalid storage path: %w", err)
    }
    
    // Ensure it's not a system directory
    if strings.HasPrefix(absPath, "/etc") || strings.HasPrefix(absPath, "/sys") || 
       strings.HasPrefix(absPath, "/proc") || strings.HasPrefix(absPath, "/dev") {
        return nil, errors.New("storage path cannot be a system directory")
    }
    
    // Check docker availability...
}
```

---

### 4. **Script Execution: Content Not Loaded from Disk**
**File**: `server/internal/service/execution.go:108`  
**Issue**: Line 108 uses `script.Content` directly, but `script` is loaded via `scriptRepo.GetByID()` which does NOT populate the `Content` field (see `repository/script.go:47-54`). The `Content` field in the model is a transient field not stored in DB. This will result in executing empty scripts.

**Risk**: All automated executions will fail silently or produce incorrect results.

**Fix**:
```go
// In execution.go:91-96, after loading script:
script, err := s.scriptRepo.GetByID(scriptID)
if err != nil {
    log.Printf("Failed to load script %d: %v", scriptID, err)
    s.markExecutionFailed(executionID)
    return
}

// Read script content from disk
content, err := os.ReadFile(script.FilePath)
if err != nil {
    log.Printf("Failed to read script file %s: %v", script.FilePath, err)
    s.markExecutionFailed(executionID)
    return
}
scriptContent := string(content)

// Then use scriptContent instead of script.Content at line 108:
result, err := s.sandbox.ExecuteScript(script.Language, scriptContent, 5*time.Minute)
```

---

### 5. **File Upload: Missing MIME Type Validation**
**Files**: 
- `server/internal/handler/case.go:148-151` (Excel import)
- `server/internal/handler/script.go:62-68` (Script upload)

**Issue**: Only file extension is validated. Attacker can upload malicious files with spoofed extensions (e.g., PHP webshell renamed to `.xlsx`).

**Risk**: Code execution if storage directory is web-accessible, or exploitation of parser vulnerabilities.

**Fix**:
```go
// For Excel import (case.go):
import "net/http"

// After saving file, validate MIME type
file, err := os.Open(tempFilePath)
if err != nil {
    response.InternalError(c, "failed to read uploaded file")
    return
}
defer file.Close()

buffer := make([]byte, 512)
_, err = file.Read(buffer)
if err != nil {
    response.InternalError(c, "failed to read file header")
    return
}

mimeType := http.DetectContentType(buffer)
if !strings.HasPrefix(mimeType, "application/vnd.openxmlformats") && 
   !strings.HasPrefix(mimeType, "application/vnd.ms-excel") {
    os.Remove(tempFilePath)
    response.BadRequest(c, "invalid Excel file format")
    return
}

// For script upload (script.go):
// Read first 512 bytes from uploaded content
mimeType := http.DetectContentType(content[:min(512, len(content))])
if !strings.HasPrefix(mimeType, "text/") && !strings.HasPrefix(mimeType, "application/octet-stream") {
    return nil, errors.New("uploaded file does not appear to be a text file")
}
```

---

### 6. **Authentication/Authorization: Completely Missing**
**Files**: All handlers, `router/router.go`, `main.go`  
**Issue**: No authentication middleware is present. All endpoints are publicly accessible without any user verification.

**Gap vs Requirements**: Product doc (line 100-103) mentions "安全考虑" but does not explicitly require auth. However, a test management platform handling test cases, scripts, and execution should have basic access control.

**Risk**: Unauthorized access, data tampering, malicious script execution.

**Fix**: Implement JWT or session-based authentication:
```go
// middleware/auth.go
func AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            response.Unauthorized(c, "missing authorization token")
            c.Abort()
            return
        }
        
        // Validate token (JWT or session)
        userID, err := validateToken(token)
        if err != nil {
            response.Unauthorized(c, "invalid token")
            c.Abort()
            return
        }
        
        c.Set("user_id", userID)
        c.Next()
    }
}

// In router.go, apply to all routes:
api := r.Group("/api/v1")
api.Use(middleware.AuthRequired())
```

---

## IMPORTANT Issues

### 7. **Excel Import: No Transaction for Batch Insert**
**File**: `server/internal/repository/case.go` (BatchCreate method not shown, but called in `service/case.go:142`)  
**Issue**: If `BatchCreate` is not wrapped in a transaction and fails midway, partial data is committed, leaving inconsistent state.

**Fix**: Ensure `BatchCreate` uses transaction:
```go
func (r *CaseRepository) BatchCreate(cases []model.TestCase) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        // Insert in batches of 100
        for i := 0; i < len(cases); i += 100 {
            end := i + 100
            if end > len(cases) {
                end = len(cases)
            }
            if err := tx.Create(cases[i:end]).Error; err != nil {
                return err
            }
        }
        return nil
    })
}
```

---

### 8. **API Debug: Header Injection Vulnerability**
**File**: `server/internal/service/api_endpoint.go:285-286`  
**Issue**: User-provided header values are set directly without sanitization. Attacker can inject newlines (`\r\n`) to inject additional headers or split HTTP response.

**Risk**: HTTP response splitting, cache poisoning, XSS via injected headers.

**Fix**:
```go
case "header":
    // Sanitize header value
    value := fmt.Sprintf("%v", value)
    if strings.ContainsAny(value, "\r\n") {
        return nil, fmt.Errorf("header value for '%s' contains invalid characters", param.Name)
    }
    headers[param.Name] = value
```

---

### 9. **OpenAPI Import: No Size Limit on Content**
**File**: `server/internal/handler/api_endpoint.go:190-195`  
**Issue**: `importAPIRequest.Content` is unbounded. Attacker can send multi-GB YAML/JSON to exhaust memory.

**Risk**: Denial of Service (OOM).

**Fix**:
```go
// In handler before parsing:
if len(req.Content) > 10*1024*1024 { // 10MB limit
    response.BadRequest(c, "OpenAPI content exceeds 10MB limit")
    return
}
```

---

### 10. **Folder Deletion: No Cascade Cleanup of Script Files**
**File**: `server/internal/repository/folder.go:85-92`  
**Issue**: When deleting folders, associated `TestScript` records are deleted from DB, but physical script files on disk are NOT removed.

**Risk**: Disk space leak, orphaned files.

**Fix**:
```go
// In folder.go Delete method, before deleting scripts from DB:
// Load all script file paths first
var scripts []model.TestScript
if err := tx.Where("folder_id IN ?", allIDs).Find(&scripts).Error; err != nil {
    return err
}

// Delete script records from DB
if err := tx.Where("folder_id IN ?", allIDs).Delete(&model.TestScript{}).Error; err != nil {
    return err
}

// Delete physical files (outside transaction, log errors but don't fail)
for _, script := range scripts {
    if err := os.Remove(script.FilePath); err != nil && !os.IsNotExist(err) {
        log.Printf("Warning: failed to delete script file %s: %v", script.FilePath, err)
    }
}
```

---

### 11. **Response Format Inconsistency**
**Files**: `pkg/response/response.go:36-48`  
**Issue**: `Error()` function sets `Code` to HTTP status code (400, 404, 500), but `Success()` sets `Code` to 0. Frontend expects `code === 0` for success (see `web/src/api/request.ts:15`). However, error responses will have `code: 400` instead of a consistent error code.

**Risk**: Frontend may not properly handle errors if it only checks `code !== 0`.

**Fix**: Use consistent application-level codes:
```go
func Error(c *gin.Context, httpCode int, message string) {
    c.JSON(httpCode, Response{
        Code:    1,  // Application error code
        Message: message,
    })
}
```

---

### 12. **Excel Import: Partial Success Not Clearly Reported**
**File**: `server/internal/service/case.go:125-149`  
**Issue**: `ImportResult` returns `SuccessCount` and `FailedCount`, but frontend API type mismatch. Frontend expects `{ imported: number }` (see `web/src/api/cases.ts:41`), but backend returns `{ success_count, failed_count, errors }`.

**Risk**: Frontend cannot display import results correctly.

**Fix**: Update frontend type or backend response to match:
```typescript
// In web/src/api/cases.ts:
export const importExcel = async (
  folderId: number,
  file: File,
): Promise<{ success_count: number; failed_count: number; errors: Array<{row: number; message: string}> }> => {
  // ...
}
```

---

### 13. **Script Upload: Language Not Inferred from File Extension**
**File**: `server/internal/handler/script.go:75-79`  
**Issue**: Handler requires `language` as a separate form field. If user uploads `test.py` but forgets to set `language=python`, upload fails. Frontend correctly infers language (see `web/src/stores/scriptStore.ts`), but backend should also infer as fallback.

**Fix**:
```go
language := c.PostForm("language")
if language == "" {
    // Infer from file extension
    ext := filepath.Ext(header.Filename)
    switch ext {
    case ".go":
        language = "go"
    case ".py":
        language = "python"
    default:
        response.BadRequest(c, "unable to determine language, please specify 'go' or 'python'")
        return
    }
}
```

---

## MINOR Issues

### 14. **Docker Image Pull: No Timeout**
**File**: `server/internal/service/sandbox.go:131-136`  
**Issue**: `docker pull` command has no timeout. If registry is slow or unreachable, it can hang indefinitely.

**Fix**:
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
defer cancel()
cmd := exec.CommandContext(ctx, "docker", "pull", imageName)
```

---

### 15. **Error Handler: Exposes Internal Error Details**
**File**: `server/internal/middleware/error_handler.go:16`  
**Issue**: Panic recovery returns raw error object in JSON response, potentially leaking stack traces or sensitive info.

**Fix**:
```go
c.JSON(http.StatusInternalServerError, gin.H{
    "code":    http.StatusInternalServerError,
    "message": "Internal server error",
    // Remove "error" field in production
})
```

---

### 16. **Execution Service: No Limit on Concurrent Executions**
**File**: `server/internal/service/execution.go:68`  
**Issue**: Each `Create()` call spawns a goroutine. No limit on concurrent executions, which can exhaust system resources.

**Fix**: Use a worker pool or semaphore:
```go
var executionSemaphore = make(chan struct{}, 5) // Max 5 concurrent executions

func (s *ExecutionService) executeAsync(...) {
    executionSemaphore <- struct{}{} // Acquire
    defer func() { <-executionSemaphore }() // Release
    
    // ... existing logic
}
```

---

### 17. **Report Download: Filename Not Sanitized**
**File**: `server/internal/handler/report.go:86`  
**Issue**: `filepath.Base(filePath)` is used for `Content-Disposition` filename. If `filePath` contains special characters or is manipulated, it could cause issues.

**Fix**:
```go
filename := filepath.Base(filePath)
// Sanitize filename
filename = strings.ReplaceAll(filename, "\"", "")
c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
```

---

### 18. **Frontend: API Import Uses Wrong Endpoint**
**File**: `web/src/api/apis.ts:35-48`  
**Issue**: `importOpenAPI` sends `FormData` with file, but backend expects JSON with `content` and `format` fields (see `server/internal/handler/api_endpoint.go:191-195`).

**Risk**: Import feature is broken.

**Fix**: Update frontend to send JSON:
```typescript
export const importOpenAPI = async (
  content: string,
  format: 'json' | 'yaml',
): Promise<{ imported_count: number; apis: TestAPI[] }> => {
  const response = await request.post<ApiResponse<{ imported_count: number; apis: TestAPI[] }>>(
    "/apis/import",
    { content, format },
  );
  return response.data.data;
};
```

---

### 19. **Frontend: Script API Mismatch**
**File**: `web/src/api/scripts.ts:28`  
**Issue**: `uploadScript` sends `folder_id` but backend handler expects `language` field as well (see `server/internal/handler/script.go:75`).

**Risk**: Upload will fail if language is not provided.

**Fix**: Add language to FormData:
```typescript
export const uploadScript = async (
  folderId: number,
  file: File,
  language: 'go' | 'python',
): Promise<TestScript> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder_id", String(folderId));
  formData.append("language", language);
  // ...
};
```

---

### 20. **Frontend: Script Update API Incorrect**
**File**: `web/src/api/scripts.ts:38-46`  
**Issue**: `updateScript` sends `{ name?, content? }` but backend only accepts `{ content }` (see `server/internal/handler/script.go:140-142`).

**Risk**: Updating script name will fail.

**Fix**: Remove `name` from update payload or add support in backend.

---

## Summary

**Critical**: 6 issues (SSRF, Docker security, path traversal, script content bug, MIME validation, missing auth)  
**Important**: 7 issues (transactions, header injection, size limits, file cleanup, response format, type mismatches)  
**Minor**: 7 issues (timeouts, error exposure, concurrency limits, filename sanitization, API mismatches)

**Recommendation**: Address all Critical issues before deployment. Important issues should be fixed in next sprint. Minor issues can be tracked as technical debt.

---

**Next Steps**:
1. Fix Critical #4 (script content loading) immediately - this breaks core functionality
2. Implement authentication (Critical #6) before any production deployment
3. Add SSRF protection (Critical #1) and Docker security hardening (Critical #2)
4. Add integration tests for file upload, import, and execution flows
5. Align frontend/backend API contracts (Important #12, Minor #18-20)
