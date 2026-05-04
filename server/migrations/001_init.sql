-- Migration 001: Initialize all tables
-- Up

CREATE TABLE IF NOT EXISTS folders (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id BIGINT REFERENCES folders(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_module ON folders(module);
CREATE INDEX idx_folders_deleted_at ON folders(deleted_at);

CREATE TABLE IF NOT EXISTS test_cases (
    id BIGSERIAL PRIMARY KEY,
    folder_id BIGINT REFERENCES folders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    precondition TEXT DEFAULT '',
    steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_test_cases_folder_id ON test_cases(folder_id);
CREATE INDEX idx_test_cases_deleted_at ON test_cases(deleted_at);

CREATE TABLE IF NOT EXISTS test_apis (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_test_apis_deleted_at ON test_apis(deleted_at);

CREATE TABLE IF NOT EXISTS api_params (
    id BIGSERIAL PRIMARY KEY,
    api_id BIGINT NOT NULL REFERENCES test_apis(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT DEFAULT '',
    required BOOLEAN DEFAULT FALSE,
    position VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0
);

CREATE INDEX idx_api_params_api_id ON api_params(api_id);

CREATE TABLE IF NOT EXISTS test_scripts (
    id BIGSERIAL PRIMARY KEY,
    folder_id BIGINT REFERENCES folders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    language VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content TEXT DEFAULT '',
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_test_scripts_folder_id ON test_scripts(folder_id);
CREATE INDEX idx_test_scripts_deleted_at ON test_scripts(deleted_at);

CREATE TABLE IF NOT EXISTS executions (
    id BIGSERIAL PRIMARY KEY,
    script_id BIGINT NOT NULL REFERENCES test_scripts(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    total_cases INT DEFAULT 0,
    passed_cases INT DEFAULT 0,
    failed_cases INT DEFAULT 0,
    timeout_cases INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_executions_script_id ON executions(script_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_deleted_at ON executions(deleted_at);

CREATE TABLE IF NOT EXISTS execution_results (
    id BIGSERIAL PRIMARY KEY,
    execution_id BIGINT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    case_id BIGINT NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    output TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    duration_ms BIGINT DEFAULT 0,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_execution_results_execution_id ON execution_results(execution_id);
CREATE INDEX idx_execution_results_case_id ON execution_results(case_id);

CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    execution_id BIGINT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    format VARCHAR(50) NOT NULL,
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_execution_id ON reports(execution_id);
CREATE INDEX idx_reports_deleted_at ON reports(deleted_at);

-- Down
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS execution_results;
DROP TABLE IF EXISTS executions;
DROP TABLE IF EXISTS test_scripts;
DROP TABLE IF EXISTS api_params;
DROP TABLE IF EXISTS test_apis;
DROP TABLE IF EXISTS test_cases;
DROP TABLE IF EXISTS folders;
