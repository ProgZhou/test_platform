# 后端开发任务清单

## 基础设施

- [ ] 任务 B-01: 初始化 Go 项目（go mod、Gin 框架、项目结构）
  - 涉及文件: `server/cmd/server/main.go`, `server/go.mod`, `server/internal/router/router.go`
  - 依赖: 无

- [ ] 任务 B-02: 配置数据库连接和迁移脚本
  - 涉及文件: `server/internal/config/config.go`, `server/migrations/001_init.sql`
  - 依赖: B-01

- [ ] 任务 B-03: 定义数据模型和通用中间件
  - 涉及文件: `server/internal/model/models.go`, `server/internal/middleware/cors.go`, `server/internal/middleware/error_handler.go`
  - 依赖: B-01

## 目录管理

- [ ] 任务 B-04: 实现目录 CRUD（Repository + Service + Handler）
  - 涉及文件: `server/internal/repository/folder.go`, `server/internal/service/folder.go`, `server/internal/handler/folder.go`
  - 依赖: B-02, B-03

- [ ] 任务 B-05: 实现目录级联删除逻辑
  - 涉及文件: `server/internal/service/folder.go`, `server/internal/repository/folder.go`
  - 依赖: B-04

- [ ] 任务 B-06: 实现目录树查询（递归查询，返回树形结构）
  - 涉及文件: `server/internal/repository/folder.go`, `server/internal/handler/folder.go`
  - 依赖: B-04

## 测试用例管理

- [ ] 任务 B-07: 实现用例 CRUD（Repository + Service + Handler）
  - 涉及文件: `server/internal/repository/case.go`, `server/internal/service/case.go`, `server/internal/handler/case.go`
  - 依赖: B-04

- [ ] 任务 B-08: 实现 Excel 解析和批量导入（逐行校验、部分成功）
  - 涉及文件: `server/internal/service/excel_parser.go`, `server/internal/handler/case.go`
  - 依赖: B-07

- [ ] 任务 B-09: 实现 Excel 模板下载
  - 涉及文件: `server/internal/handler/case.go`
  - 依赖: B-07

## 测试接口管理

- [ ] 任务 B-10: 实现接口 CRUD（Repository + Service + Handler）
  - 涉及文件: `server/internal/repository/api_endpoint.go`, `server/internal/service/api_endpoint.go`, `server/internal/handler/api_endpoint.go`
  - 依赖: B-02, B-03

- [ ] 任务 B-11: 实现参数校验器（参数名正则、类型枚举、位置枚举）
  - 涉及文件: `server/pkg/validator/param_validator.go`
  - 依赖: B-10

- [ ] 任务 B-12: 实现 OpenAPI 3.x 解析器（YAML/JSON → 接口列表）
  - 涉及文件: `server/internal/service/openapi_parser.go`
  - 依赖: B-10

- [ ] 任务 B-13: 实现接口在线调试（后端代理转发请求，返回响应详情）
  - 涉及文件: `server/internal/service/api_endpoint.go`, `server/internal/handler/api_endpoint.go`
  - 依赖: B-10

## 测试脚本管理

- [ ] 任务 B-14: 实现脚本上传（文件类型校验、大小校验、本地存储）
  - 涉及文件: `server/internal/handler/script.go`, `server/internal/service/script.go`, `server/internal/repository/script.go`
  - 依赖: B-04

- [ ] 任务 B-15: 实现脚本内容读取和在线修改
  - 涉及文件: `server/internal/handler/script.go`, `server/internal/service/script.go`
  - 依赖: B-14

- [ ] 任务 B-16: 实现 Docker 沙箱执行引擎（容器创建、资源限制、超时控制）
  - 涉及文件: `server/internal/service/sandbox.go`
  - 依赖: B-01

- [ ] 任务 B-17: 实现脚本在线调试（沙箱执行 + SSE 流式输出）
  - 涉及文件: `server/internal/handler/script.go`, `server/internal/service/script.go`
  - 依赖: B-15, B-16

## 自动化执行

- [ ] 任务 B-18: 实现执行任务创建（校验用例+脚本存在性）
  - 涉及文件: `server/internal/handler/execution.go`, `server/internal/service/execution.go`, `server/internal/repository/execution.go`
  - 依赖: B-07, B-14

- [ ] 任务 B-19: 实现自动化批量执行逻辑（逐条执行、超时控制、结果记录）
  - 涉及文件: `server/internal/service/execution.go`
  - 依赖: B-16, B-18

## 测试报告

- [ ] 任务 B-20: 实现测试报告生成（执行完成后自动生成 PDF/Excel）
  - 涉及文件: `server/internal/service/report.go`, `server/internal/repository/report.go`
  - 依赖: B-19

- [ ] 任务 B-21: 实现报告列表查询和下载
  - 涉及文件: `server/internal/handler/report.go`
  - 依赖: B-20
