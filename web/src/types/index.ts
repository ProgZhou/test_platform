export interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  module: "case" | "script";
  sort_order: number;
  children?: FolderNode[];
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  id: number;
  folder_id: number;
  name: string;
  precondition: string;
  steps: string;
  expected_result: string;
  created_at: string;
  updated_at: string;
}

export interface TestAPI {
  id: number;
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description: string;
  params: APIParam[];
  created_at: string;
  updated_at: string;
}

export interface APIParam {
  id: number;
  api_id: number;
  name: string;
  type: "string" | "bool" | "int" | "long" | "float" | "object" | "array<string>" | "array<int>" | "array<long>" | "array<float>" | "array<object>";
  description: string;
  required: boolean;
  position: "body" | "header";
  sort_order: number;
}

export interface TestScript {
  id: number;
  folder_id: number;
  name: string;
  language: "go" | "python";
  file_path: string;
  content: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface Execution {
  id: number;
  script_id: number;
  status: "pending" | "running" | "completed" | "failed";
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  timeout_cases: number;
  started_at: string | null;
  finished_at: string | null;
  results: ExecutionResult[];
  created_at: string;
}

export interface ExecutionResult {
  id: number;
  execution_id: number;
  case_id: number;
  status: "passed" | "failed" | "timeout";
  output: string;
  error_message: string;
  duration_ms: number;
  executed_at: string;
}

export interface Report {
  id: number;
  execution_id: number;
  file_path: string;
  format: "html" | "json" | "xml";
  file_size: number;
  created_at: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
