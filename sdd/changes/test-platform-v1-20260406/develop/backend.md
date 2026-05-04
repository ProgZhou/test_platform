# 后端开发总结

## 技术栈

- **语言**: Go 1.22
- **框架**: Gin 1.10
- **ORM**: GORM 2.x
- **数据库**: PostgreSQL 15
- **Excel 处理**: excelize v2.8
- **PDF 生成**: gofpdf v1.16
- **容器执行**: Docker CLI

## 项目结构

```
server/
├── cmd/server/
│   └── main.go                    # 应用入口
├── internal/
│   ├── config/
│   │   └── config.go              # 配置管理（数据库、存储路径）
│   ├── model/
│   │   └── models.go              # GORM 数据模型（8个表）
│   ├── middleware/
│   │   ├── cors.go                # CORS 中间件
│   │   └── error_handler.go      # 错误恢复中间件
│   ├── router/
│   │   └── router.go              # 路由注册和依赖注入
│   ├── repository/                # 数据访问层
│   │   ├── folder.go              # 目录仓储
│   │   ├── case.go                # 测试用例仓储
│   │   ├── api_endpoint.go        # 接口仓储
│   │   ├── script.go              # 脚本仓储
│   │   ├── execution.go           # 执行仓储
│   │   └── report.go              # 报告仓储
│   ├── service/                   # 业务逻辑层
│   │   ├── folder.go              # 目录服务
│   │   ├── case.go                # 用例服务
│   │   ├── excel_parser.go        # Excel 解析器
│   │   ├── api_endpoint.go        # 接口服务
│   │   ├── openapi_parser.go      # OpenAPI 解析器
│   │   ├── script.go              # 脚本服务
│   │   ├── sandbox.go             # Docker 沙箱执行引擎
│   │   ├── execution.go           # 执行服务
│   │   └── report.go              # 报告生成服务
│   └── handler/                   # HTTP 处理层
│       ├── folder.go              # 目录接口
│       ├── case.go                # 用例接口
│       ├── api_endpoint.go        # 接口管理接口
│       ├── script.go              # 脚本接口
│       ├── execution.go           # 执行接口
│       └── report.go              # 报告接口
├── pkg/
│   ├── response/
│   │   └── response.go            # 统一响应格式
│   └── validator/
│       └── param_validator.go     # 参数名校验器
├── migrations/
│   └── 001_init.sql               # 数据库初始化脚本
└── go.mod                         # 依赖管理
```

## 核心功能实现

### 1. 目录管理 (Folder Management)

**文件**: `repository/folder.go`, `service/folder.go`, `handler/folder.go`

**功能**:
- 递归查询目录树结构（支持无限层级嵌套）
- 创建、重命名、删除目录
- 级联删除：删除目录时自动删除所有子目录及关联的测试用例/脚本
- 模块隔离：用例目录和脚本目录分开管理

**关键实现**:
- `GetTree()`: 使用递归加载构建完整的树形结构
- `Delete()`: 事务中先获取所有后代节点ID，再批量删除关联数据

### 2. 测试用例管理 (Test Case Management)

**文件**: `repository/case.go`, `service/case.go`, `service/excel_parser.go`, `handler/case.go`

**功能**:
- 用例 CRUD 操作（创建、查询、更新、删除）
- 分页查询，支持按目录筛选
- Excel 批量导入（支持部分成功）
- Excel 模板下载

**关键实现**:
- `ExcelParser.ParseTestCases()`: 逐行解析 Excel，跳过空行，收集每行的错误信息
- `ImportFromExcel()`: 批量插入有效数据（每100条一批），返回成功/失败统计
- `GenerateTemplate()`: 生成带样式的 Excel 模板，包含表头和示例行

**Excel 格式**:
- 必填列：用例名称、前置条件、操作步骤、预期结果
- 支持 .xlsx 和 .xls 格式
- 文件大小限制 10MB

### 3. 测试接口管理 (API Endpoint Management)

**文件**: `repository/api_endpoint.go`, `service/api_endpoint.go`, `service/openapi_parser.go`, `handler/api_endpoint.go`

**功能**:
- 接口 CRUD 操作
- OpenAPI 3.x 定义导入（支持 JSON/YAML）
- 接口在线调试（后端代理转发）
- 参数管理（支持11种参数类型）

**关键实现**:
- `OpenAPIParser.Parse()`: 解析 OpenAPI 定义，提取路径、方法、参数
- `Debug()`: 根据接口定义和参数值构建 HTTP 请求，通过后端代理发送，返回响应详情
- 参数校验：参数名必须匹配正则 `^[a-zA-Z_][a-zA-Z0-9_]*$`

**支持的参数类型**:
- 基础类型：string, bool, int, long, float, object
- 数组类型：array<string>, array<int>, array<long>, array<float>, array<object>

**参数位置**:
- body（请求体）
- header（请求头）

### 4. 测试脚本管理 (Script Management)

**文件**: `repository/script.go`, `service/script.go`, `service/sandbox.go`, `handler/script.go`

**功能**:
- 脚本上传（支持 Go 和 Python）
- 脚本内容在线查看和修改
- Docker 沙箱执行（资源隔离、超时控制）
- 脚本在线调试

**关键实现**:
- `Upload()`: 验证文件类型和大小，保存到 `storage/scripts/{language}/{uuid}.{ext}`
- `SandboxService.ExecuteScript()`: 
  - 创建临时文件写入脚本内容
  - 使用 Docker CLI 运行容器
  - Go: `golang:1.22-alpine` 镜像
  - Python: `python:3.12-slim` 镜像
  - 资源限制：1核CPU、512MB内存、无网络访问
  - 超时控制：调试模式5分钟，可配置
  - 捕获标准输出/错误输出

**安全措施**:
- 容器资源限制（CPU、内存）
- 禁用网络访问（`--network none`）
- 只读文件系统（除工作目录）
- 超时强制终止

### 5. 自动化执行 (Automated Execution)

**文件**: `repository/execution.go`, `service/execution.go`, `handler/execution.go`

**功能**:
- 创建执行任务（选择脚本和用例）
- 异步批量执行测试用例
- 实时跟踪执行状态和进度
- 记录每条用例的执行结果

**关键实现**:
- `Create()`: 验证脚本和用例存在性，创建状态为 "pending" 的执行记录，启动异步执行
- `executeAsync()`: 
  - 在 goroutine 中异步执行
  - 更新状态为 "running"
  - 逐条执行用例（每条5分钟超时）
  - 记录执行结果（passed/failed/timeout/error）
  - 更新统计计数器
  - 完成后更新状态为 "completed" 或 "failed"

**执行状态**:
- pending: 待执行
- running: 执行中
- completed: 已完成
- failed: 执行失败

**结果状态**:
- passed: 通过
- failed: 失败
- timeout: 超时
- error: 错误

### 6. 测试报告 (Test Reports)

**文件**: `repository/report.go`, `service/report.go`, `handler/report.go`

**功能**:
- 自动生成测试报告（PDF/Excel）
- 报告列表查询
- 报告下载

**关键实现**:
- `Generate()`: 
  - 加载执行记录和结果
  - 根据格式生成报告文件
  - 保存到 `storage/reports/{executionID}_{timestamp}.{format}`
  - 创建报告记录

**PDF 报告** (使用 gofpdf):
- 标题：测试执行报告
- 概要统计：总数、通过、失败、超时
- 结果表格：用例ID、用例名称、状态（带颜色）、耗时、错误信息

**Excel 报告** (使用 excelize):
- Summary 工作表：执行概要统计
- Details 工作表：详细结果表格（用例ID、名称、状态、耗时、错误信息）

## API 路由

### 目录管理
- `GET /api/v1/folders?module={case|script}` - 获取目录树
- `POST /api/v1/folders` - 创建目录
- `PUT /api/v1/folders/:id` - 重命名目录
- `DELETE /api/v1/folders/:id` - 删除目录（级联）

### 测试用例
- `GET /api/v1/cases?folder_id=&page=&page_size=` - 用例列表
- `POST /api/v1/cases` - 创建用例
- `PUT /api/v1/cases/:id` - 更新用例
- `DELETE /api/v1/cases/:id` - 删除用例
- `POST /api/v1/cases/import` - Excel 导入
- `GET /api/v1/cases/template` - 下载模板

### 测试接口
- `GET /api/v1/apis?page=&page_size=` - 接口列表
- `POST /api/v1/apis` - 创建接口
- `PUT /api/v1/apis/:id` - 更新接口
- `DELETE /api/v1/apis/:id` - 删除接口
- `POST /api/v1/apis/import` - OpenAPI 导入
- `POST /api/v1/apis/:id/debug` - 接口调试

### 测试脚本
- `GET /api/v1/scripts?folder_id=&page=&page_size=` - 脚本列表
- `POST /api/v1/scripts/upload` - 上传脚本
- `GET /api/v1/scripts/:id` - 获取脚本详情
- `PUT /api/v1/scripts/:id` - 更新脚本内容
- `DELETE /api/v1/scripts/:id` - 删除脚本
- `POST /api/v1/scripts/:id/run` - 运行脚本

### 自动化执行
- `GET /api/v1/executions?page=&page_size=` - 执行列表
- `POST /api/v1/executions` - 创建执行任务
- `GET /api/v1/executions/:id` - 执行详情

### 测试报告
- `GET /api/v1/reports?page=&page_size=` - 报告列表
- `GET /api/v1/reports/:id` - 报告详情
- `GET /api/v1/reports/:id/download` - 下载报告
- `POST /api/v1/reports` - 生成报告

## 数据库设计

### 核心表

**folders** - 目录表
- 支持无限层级嵌套（parent_id 自关联）
- 模块隔离（module: case/script）
- 排序字段（sort_order）

**test_cases** - 测试用例表
- 关联目录（folder_id，可为空）
- 用例字段：名称、前置条件、操作步骤、预期结果

**test_apis** - 测试接口表
- 接口基本信息：名称、URL、方法、描述
- 关联参数表（一对多）

**api_params** - 接口参数表
- 参数属性：名称、类型、说明、是否必填、位置
- 排序字段（sort_order）

**test_scripts** - 测试脚本表
- 关联目录（folder_id，可为空）
- 脚本信息：名称、语言、文件路径、内容、文件大小

**executions** - 执行记录表
- 关联脚本（script_id）
- 执行状态和统计：状态、总数、通过数、失败数、超时数
- 时间记录：开始时间、结束时间

**execution_results** - 执行结果表
- 关联执行和用例（execution_id, case_id）
- 结果详情：状态、输出、错误信息、耗时

**reports** - 报告表
- 关联执行（execution_id）
- 报告信息：文件路径、格式、文件大小

## 依赖注入架构

采用三层架构 + 依赖注入模式：

```
Handler (HTTP层)
   ↓ 依赖
Service (业务逻辑层)
   ↓ 依赖
Repository (数据访问层)
   ↓ 依赖
GORM DB
```

**优点**:
- 职责清晰，易于测试
- 依赖关系明确，便于维护
- 支持单元测试（可 mock 依赖）

## 错误处理

- 统一响应格式：`{code, message, data}`
- 中间件捕获 panic，返回 500 错误
- 业务错误返回明确的错误信息
- 数据库错误统一处理

## 性能优化

- 分页查询（默认 20 条/页）
- 批量插入（Excel 导入每 100 条一批）
- 索引优化（外键和常用查询字段）
- 事务控制（级联删除、批量操作）

## 安全措施

- CORS 配置（开发环境允许所有来源）
- 参数校验（正则、类型、必填）
- 文件上传限制（类型、大小）
- SQL 参数化查询（防注入）
- Docker 沙箱隔离（资源限制、无网络）
- 接口调试代理（避免前端跨域）

## 启动方式

```bash
# 1. 安装依赖
cd server
go mod download

# 2. 配置环境变量（可选）
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=test_platform
export STORAGE_PATH=./storage

# 3. 启动服务
go run cmd/server/main.go
```

服务将在 `http://localhost:8080` 启动。

## 待优化项

1. 添加单元测试覆盖
2. 添加集成测试
3. 实现日志记录
4. 添加监控指标
5. 优化 Docker 镜像拉取（预拉取常用镜像）
6. 实现脚本执行的实时输出流（SSE）
7. 添加用户认证和权限控制
8. 数据库连接池优化
9. 缓存热点数据
10. 异步任务队列（替代 goroutine）
