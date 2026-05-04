# 技术设计文档

## 1. 架构概述

采用前后端分离架构：

```
┌─────────────────┐     HTTP/REST     ┌─────────────────┐
│   前端 (React)   │ ◄──────────────► │  后端 (Go/Gin)   │
│   Vite + TS     │                   │                  │
│   Ant Design 5  │                   │  ┌────────────┐  │
└─────────────────┘                   │  │ PostgreSQL │  │
                                      │  └────────────┘  │
                                      │  ┌────────────┐  │
                                      │  │ 本地文件存储 │  │
                                      │  └────────────┘  │
                                      │  ┌────────────┐  │
                                      │  │ Docker沙箱  │  │
                                      │  └────────────┘  │
                                      └─────────────────┘
```

### 技术选型

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | 18.x |
| UI 组件库 | Ant Design | 5.x |
| 构建工具 | Vite | 5.x |
| 状态管理 | Zustand | 4.x |
| HTTP 客户端 | Axios | 1.x |
| 代码编辑器 | Monaco Editor | 0.45+ |
| 后端框架 | Go + Gin | 1.22 / 1.9 |
| ORM | GORM | 2.x |
| 数据库 | PostgreSQL | 15 |
| 文件存储 | 本地文件系统 | - |
| 脚本沙箱 | Docker | 24+ |
| Excel 解析 | excelize (Go) | 2.8 |
| OpenAPI 解析 | libopenapi (Go) | 0.16+ |
| PDF 生成 | gofpdf | 2.x |

## 2. 前端设计

### 2.1 路由结构

```
/                          → 首页/仪表盘
/cases                     → 测试用例管理
/cases/:folderId           → 目录下的用例列表
/apis                      → 测试接口管理
/apis/:id/debug            → 接口调试
/scripts                   → 测试脚本管理
/scripts/:id/edit          → 脚本在线编辑
/execution                 → 自动化执行
/execution/:id             → 执行详情
/reports                   → 测试报告列表
/reports/:id               → 报告详情
```

### 2.2 页面/组件结构

```
src/
├── api/                    # API 调用层
│   ├── cases.ts
│   ├── folders.ts
│   ├── apis.ts
│   ├── scripts.ts
│   ├── execution.ts
│   └── reports.ts
├── components/
│   ├── FolderTree/         # 目录树组件（共用）
│   │   ├── FolderTree.tsx
│   │   └── FolderTreeNode.tsx
│   ├── CodeEditor/         # Monaco 代码编辑器封装
│   │   └── CodeEditor.tsx
│   └── common/
│       ├── ConfirmModal.tsx
│       └── FileUpload.tsx
├── pages/
│   ├── Cases/
│   │   ├── CaseList.tsx        # 用例列表
│   │   ├── CaseForm.tsx        # 用例创建/编辑表单
│   │   └── CaseImport.tsx      # Excel 导入
│   ├── Apis/
│   │   ├── ApiList.tsx         # 接口列表
│   │   ├── ApiForm.tsx         # 接口表单录入
│   │   ├── ApiImportOpenAPI.tsx # OpenAPI 导入
│   │   ├── ApiDebug.tsx        # 接口调试
│   │   └── ParamEditor.tsx     # 参数编辑器
│   ├── Scripts/
│   │   ├── ScriptList.tsx      # 脚本列表
│   │   ├── ScriptUpload.tsx    # 脚本上传
│   │   └── ScriptEditor.tsx    # 在线编辑+调试
│   ├── Execution/
│   │   ├── ExecutionCreate.tsx # 创建执行任务
│   │   └── ExecutionDetail.tsx # 执行详情
│   └── Reports/
│       ├── ReportList.tsx      # 报告列表
│       └── ReportDetail.tsx    # 报告详情+下载
├── stores/
│   ├── folderStore.ts
│   ├── caseStore.ts
│   ├── apiStore.ts
│   ├── scriptStore.ts
│   └── executionStore.ts
├── types/
│   └── index.ts
├── utils/
│   ├── validators.ts       # 参数名校验等
│   └── openapi-parser.ts   # 前端 OpenAPI 预览解析
├── App.tsx
└── main.tsx
```

### 2.3 状态管理 (Zustand)

```typescript
// stores/folderStore.ts
interface FolderStore {
  tree: FolderNode[];
  selectedFolderId: number | null;
  loading: boolean;
  fetchTree: (module: 'case' | 'script') => Promise<void>;
  createFolder: (parentId: number | null, name: string, module: string) => Promise<void>;
  renameFolder: (id: number, name: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;
}
```

### 2.4 前端 API 调用

| 接口 | 方法 | 用途 |
|------|------|------|
| /api/v1/folders | GET | 获取目录树 |
| /api/v1/folders | POST | 创建目录 |
| /api/v1/folders/:id | PUT | 重命名目录 |
| /api/v1/folders/:id | DELETE | 删除目录 |
| /api/v1/cases | GET | 获取用例列表 |
| /api/v1/cases | POST | 创建用例 |
| /api/v1/cases/:id | PUT | 编辑用例 |
| /api/v1/cases/:id | DELETE | 删除用例 |
| /api/v1/cases/import | POST | Excel 导入用例 |
| /api/v1/cases/template | GET | 下载 Excel 模板 |
| /api/v1/apis | GET | 获取接口列表 |
| /api/v1/apis | POST | 创建接口（表单） |
| /api/v1/apis/import | POST | OpenAPI 导入 |
| /api/v1/apis/:id | PUT | 编辑接口 |
| /api/v1/apis/:id | DELETE | 删除接口 |
| /api/v1/apis/:id/debug | POST | 接口调试 |
| /api/v1/scripts | GET | 获取脚本列表 |
| /api/v1/scripts/upload | POST | 上传脚本 |
| /api/v1/scripts/:id | PUT | 更新脚本内容 |
| /api/v1/scripts/:id | DELETE | 删除脚本 |
| /api/v1/scripts/:id/run | POST | 调试运行脚本 |
| /api/v1/executions | POST | 创建执行任务 |
| /api/v1/executions/:id | GET | 获取执行详情 |
| /api/v1/executions | GET | 获取执行列表 |
| /api/v1/reports | GET | 获取报告列表 |
| /api/v1/reports/:id | GET | 获取报告详情 |
| /api/v1/reports/:id/download | GET | 下载报告 |

## 3. 后端设计

### 3.1 项目结构

```
server/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── handler/
│   │   ├── folder.go
│   │   ├── case.go
│   │   ├── api.go
│   │   ├── script.go
│   │   ├── execution.go
│   │   └── report.go
│   ├── middleware/
│   │   ├── cors.go
│   │   └── error.go
│   ├── model/
│   │   ├── folder.go
│   │   ├── case.go
│   │   ├── api.go
│   │   ├── api_param.go
│   │   ├── script.go
│   │   ├── execution.go
│   │   ├── execution_result.go
│   │   └── report.go
│   ├── repository/
│   │   ├── folder.go
│   │   ├── case.go
│   │   ├── api.go
│   │   ├── script.go
│   │   ├── execution.go
│   │   └── report.go
│   ├── service/
│   │   ├── folder.go
│   │   ├── case.go
│   │   ├── api.go
│   │   ├── script.go
│   │   ├── execution.go
│   │   ├── sandbox.go       # Docker 沙箱执行
│   │   ├── openapi_parser.go
│   │   ├── excel_parser.go
│   │   └── report.go
│   └── router/
│       └── router.go
├── pkg/
│   └── response/
│       └── response.go
├── storage/                  # 本地文件存储目录
│   ├── scripts/
│   ├── uploads/
│   └── reports/
├── go.mod
└── go.sum
```

### 3.2 API 设计（RESTful）

#### 目录管理

```
GET    /api/v1/folders?module={case|script}
       响应: { "data": [{ "id": 1, "name": "项目A", "parent_id": null, "children": [...] }] }

POST   /api/v1/folders
       请求: { "name": "小组B", "parent_id": 1, "module": "case" }
       响应: { "data": { "id": 2, "name": "小组B", "parent_id": 1 } }

PUT    /api/v1/folders/:id
       请求: { "name": "新名称" }

DELETE /api/v1/folders/:id?cascade=true
       说明: cascade=true 时级联删除子目录和内容
```

#### 测试用例管理

```
GET    /api/v1/cases?folder_id=1&page=1&page_size=20&keyword=xxx
       响应: { "data": { "items": [...], "total": 100 } }

POST   /api/v1/cases
       请求: {
         "folder_id": 1,
         "name": "登录成功",
         "precondition": "用户已注册",
         "steps": "1. 输入用户名\n2. 输入密码\n3. 点击登录",
         "expected_result": "跳转到首页"
       }

PUT    /api/v1/cases/:id
       请求: 同创建

DELETE /api/v1/cases/:id

POST   /api/v1/cases/import
       Content-Type: multipart/form-data
       参数: file (Excel), folder_id
       响应: { "data": { "success_count": 95, "fail_count": 5, "errors": [{"row": 3, "reason": "缺少用例名称"}] } }

GET    /api/v1/cases/template
       响应: Excel 文件下载
```

#### 测试接口管理

```
GET    /api/v1/apis?page=1&page_size=20&keyword=xxx
       响应: { "data": { "items": [...], "total": 50 } }

POST   /api/v1/apis
       请求: {
         "name": "获取用户列表",
         "url": "https://api.example.com/users",
         "method": "GET",
         "params": [
           { "name": "username", "type": "string", "description": "用户名", "required": true, "position": "body" }
         ]
       }

POST   /api/v1/apis/import
       请求: { "content": "openapi: 3.0.1\n...", "format": "yaml" }
       响应: { "data": { "imported_count": 5, "apis": [...] } }

PUT    /api/v1/apis/:id
       请求: 同创建

DELETE /api/v1/apis/:id

POST   /api/v1/apis/:id/debug
       请求: { "params": { "username": "test" }, "headers": { "Authorization": "Bearer xxx" } }
       响应: { "data": { "status_code": 200, "headers": {...}, "body": "...", "duration_ms": 123 } }
```

#### 测试脚本管理

```
GET    /api/v1/scripts?folder_id=1&page=1&page_size=20
       响应: { "data": { "items": [...], "total": 30 } }

POST   /api/v1/scripts/upload
       Content-Type: multipart/form-data
       参数: file (.go/.py), folder_id
       校验: 文件后缀 .go 或 .py，大小 <= 10MB

GET    /api/v1/scripts/:id
       响应: { "data": { "id": 1, "name": "test_login.py", "content": "...", "language": "python" } }

PUT    /api/v1/scripts/:id
       请求: { "content": "print('hello')" }

DELETE /api/v1/scripts/:id

POST   /api/v1/scripts/:id/run
       响应: { "data": { "output": "hello\n", "exit_code": 0, "duration_ms": 1500 } }
       说明: 在 Docker 沙箱中执行，超时 5 分钟
```

#### 自动化执行

```
POST   /api/v1/executions
       请求: { "case_ids": [1,2,3], "script_id": 5 }
       校验: case_ids 和 script_id 不能为空
       响应: { "data": { "id": 1, "status": "running" } }

GET    /api/v1/executions?page=1&page_size=20
GET    /api/v1/executions/:id
       响应: { "data": { "id": 1, "status": "completed", "results": [...], "report_id": 1 } }
```

#### 测试报告

```
GET    /api/v1/reports?page=1&page_size=20
GET    /api/v1/reports/:id
       响应: { "data": { "id": 1, "total": 10, "passed": 8, "failed": 1, "timeout": 1, "results": [...] } }

GET    /api/v1/reports/:id/download?format=pdf
       响应: 文件下载 (PDF 或 Excel)
```

### 3.3 数据库设计

```sql
-- 目录表（用例和脚本共用）
CREATE TABLE folders (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id BIGINT REFERENCES folders(id) ON DELETE CASCADE,
    module VARCHAR(20) NOT NULL CHECK (module IN ('case', 'script')),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_module ON folders(module);

-- 测试用例表
CREATE TABLE test_cases (
    id BIGSERIAL PRIMARY KEY,
    folder_id BIGINT REFERENCES folders(id) ON DELETE SET NULL,
    name VARCHAR(500) NOT NULL,
    precondition TEXT DEFAULT '',
    steps TEXT DEFAULT '',
    expected_result TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_test_cases_folder_id ON test_cases(folder_id);

-- 测试接口表
CREATE TABLE test_apis (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 接口参数表
CREATE TABLE api_params (
    id BIGSERIAL PRIMARY KEY,
    api_id BIGINT NOT NULL REFERENCES test_apis(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('string','bool','int','long','float','object','array<string>','array<int>','array<long>','array<float>','array<object>')),
    description TEXT DEFAULT '',
    required BOOLEAN DEFAULT false,
    position VARCHAR(20) NOT NULL CHECK (position IN ('body', 'header')),
    sort_order INT DEFAULT 0
);
CREATE INDEX idx_api_params_api_id ON api_params(api_id);

-- 测试脚本表
CREATE TABLE test_scripts (
    id BIGSERIAL PRIMARY KEY,
    folder_id BIGINT REFERENCES folders(id) ON DELETE SET NULL,
    name VARCHAR(500) NOT NULL,
    language VARCHAR(20) NOT NULL CHECK (language IN ('go', 'python')),
    file_path VARCHAR(1024) NOT NULL,
    content TEXT DEFAULT '',
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_test_scripts_folder_id ON test_scripts(folder_id);

-- 执行记录表
CREATE TABLE executions (
    id BIGSERIAL PRIMARY KEY,
    script_id BIGINT NOT NULL REFERENCES test_scripts(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
    total_cases INT DEFAULT 0,
    passed_cases INT DEFAULT 0,
    failed_cases INT DEFAULT 0,
    timeout_cases INT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 执行结果明细表
CREATE TABLE execution_results (
    id BIGSERIAL PRIMARY KEY,
    execution_id BIGINT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    case_id BIGINT NOT NULL REFERENCES test_cases(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('passed','failed','timeout','error')),
    output TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    duration_ms INT DEFAULT 0,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_execution_results_execution_id ON execution_results(execution_id);

-- 测试报告表
CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    execution_id BIGINT NOT NULL REFERENCES executions(id),
    file_path VARCHAR(1024) NOT NULL,
    format VARCHAR(10) NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel')),
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_reports_execution_id ON reports(execution_id);
```

## 4. 安全考虑

- **脚本沙箱隔离**: 所有用户脚本在 Docker 容器中执行，限制 CPU(1核)、内存(512MB)、无网络访问、只读文件系统（除工作目录）
- **接口调试代理**: 前端不直接发起跨域请求，通过后端代理转发，避免 CORS 和安全风险
- **文件上传校验**: 后缀白名单（.go/.py/.xlsx）、大小限制（10MB）、MIME 类型校验
- **输入校验**: 参数名正则 `^[a-zA-Z_][a-zA-Z0-9_]*$`，SQL 参数化查询防注入
- **XSS 防护**: 前端对用户输入进行转义，后端返回 Content-Type 头

## 5. 性能考量

- **数据库索引**: 所有外键和常用查询字段建立索引
- **分页查询**: 所有列表接口支持分页，默认 page_size=20
- **Excel 导入**: 流式解析，逐行处理，避免一次性加载大文件到内存
- **脚本执行超时**: 单条用例 5 分钟超时，通过 Docker 容器 stop 强制终止
- **文件存储**: V1 使用本地文件系统，后续可切换为对象存储
