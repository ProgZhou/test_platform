# 前端开发总结

## 技术栈

- **框架**: React 19.x + TypeScript
- **UI 组件库**: Ant Design 6.x
- **构建工具**: Vite 6.x
- **状态管理**: Zustand 5.x
- **HTTP 客户端**: Axios 1.x
- **代码编辑器**: Monaco Editor (@monaco-editor/react 4.x)
- **路由**: React Router 7.x

## 项目结构

```
web/src/
├── api/                          # API 调用层
│   ├── request.ts                # Axios 实例（baseURL /api/v1，30s 超时）
│   ├── folders.ts                # 目录接口
│   ├── cases.ts                  # 测试用例接口
│   ├── apis.ts                   # 测试接口管理接口
│   ├── scripts.ts                # 测试脚本接口
│   ├── execution.ts              # 执行任务接口
│   └── reports.ts                # 测试报告接口
├── components/                   # 共享组件
│   ├── Layout/
│   │   └── AppLayout.tsx         # 主布局（侧边栏导航 + 内容区）
│   ├── FolderTree/
│   │   └── FolderTree.tsx        # 目录树组件（右键菜单、创建/重命名/删除）
│   ├── CodeEditor/
│   │   └── CodeEditor.tsx        # Monaco 编辑器封装
│   └── common/
│       └── ConfirmModal.tsx      # 确认弹窗组件
├── pages/                        # 页面组件
│   ├── Cases/
│   │   ├── CaseList.tsx          # 用例列表页
│   │   ├── CaseForm.tsx          # 用例创建/编辑表单
│   │   └── CaseImport.tsx        # Excel 导入弹窗
│   ├── Apis/
│   │   ├── ApiList.tsx           # 接口列表页
│   │   ├── ApiForm.tsx           # 接口创建/编辑表单
│   │   ├── ApiImportOpenAPI.tsx  # OpenAPI 导入弹窗
│   │   └── ApiDebug.tsx          # 接口在线调试页
│   ├── Scripts/
│   │   ├── ScriptList.tsx        # 脚本列表页
│   │   ├── ScriptUpload.tsx      # 脚本上传弹窗
│   │   └── ScriptEditor.tsx      # 脚本在线编辑+调试页
│   ├── Execution/
│   │   ├── ExecutionCreate.tsx   # 创建执行任务页
│   │   └── ExecutionDetail.tsx   # 执行详情页
│   └── Reports/
│       ├── ReportList.tsx        # 报告列表页
│       └── ReportDetail.tsx      # 报告详情页
├── stores/                       # Zustand 状态管理
│   ├── folderStore.ts            # 目录树状态
│   ├── caseStore.ts              # 测试用例状态
│   ├── apiStore.ts               # 测试接口状态
│   ├── scriptStore.ts            # 测试脚本状态
│   └── executionStore.ts         # 执行任务状态
├── types/
│   └── index.ts                  # TypeScript 类型定义
├── utils/
│   └── validators.ts             # 参数名校验工具
├── App.tsx                       # 路由配置
└── main.tsx                      # 应用入口
```

## 路由设计

| 路径 | 页面 | 加载方式 |
|------|------|----------|
| `/` | 重定向到 `/cases` | - |
| `/cases` | 测试用例列表 | 懒加载 |
| `/apis` | 测试接口列表 | 懒加载 |
| `/apis/:id/debug` | 接口在线调试 | 懒加载 |
| `/scripts` | 测试脚本列表 | 懒加载 |
| `/scripts/:id/edit` | 脚本在线编辑 | 懒加载 |
| `/execution` | 创建执行任务 | 懒加载 |
| `/execution/:id` | 执行详情 | 懒加载 |
| `/reports` | 测试报告列表 | 懒加载 |
| `/reports/:id` | 报告详情 | 懒加载 |

所有页面均使用 `React.lazy` + `Suspense` 实现按需加载，加载时显示 Spin 组件。

## 核心功能实现

### 1. 主布局 (AppLayout)

**文件**: `components/Layout/AppLayout.tsx` (74行)

- 可折叠的深色侧边栏导航
- 菜单项：用例管理、接口管理、脚本管理、自动化执行、测试报告
- 使用 `Outlet` 渲染子路由内容

### 2. 目录树组件 (FolderTree)

**文件**: `components/FolderTree/FolderTree.tsx` (215行)

- 基于 Ant Design `DirectoryTree` 实现
- 支持 `case` 和 `script` 两种模块
- 右键上下文菜单：新建子目录、重命名、删除
- 弹窗操作：创建/重命名使用 Modal + Input
- 将 `FolderNode[]` 递归转换为 Ant Tree 的 `DataNode[]`

### 3. 代码编辑器 (CodeEditor)

**文件**: `components/CodeEditor/CodeEditor.tsx` (37行)

- 封装 `@monaco-editor/react`
- 支持属性：value、onChange、language、readOnly
- 暗色主题，禁用小地图

### 4. 测试用例管理

**文件**: `pages/Cases/CaseList.tsx` (258行), `CaseForm.tsx`, `CaseImport.tsx`

**CaseList 页面**:
- 双栏布局：左侧目录树 + 右侧用例表格
- 表格列：用例名称、前置条件、操作步骤、预期结果、操作
- 功能按钮：新建用例、导入 Excel、下载模板
- 行操作：编辑（弹窗表单）、删除（确认弹窗）
- 支持分页（默认20条/页）
- 支持关键词搜索

**CaseForm 弹窗**:
- 表单字段：用例名称（必填）、前置条件、操作步骤（TextArea）、预期结果（TextArea）
- 自动识别创建/编辑模式
- 关闭时重置表单

**CaseImport 弹窗**:
- 拖拽上传组件，仅接受 .xlsx/.xls 文件，最大 10MB
- 显示导入结果：成功数、失败数
- 错误表格：行号 + 错误信息

### 5. 测试接口管理

**文件**: `pages/Apis/ApiList.tsx` (226行), `ApiForm.tsx` (283行), `ApiImportOpenAPI.tsx` (287行), `ApiDebug.tsx` (404行)

**ApiList 页面**:
- 表格列：接口名称、URL、请求方法（彩色 Tag）、参数数量、操作
- 支持关键词搜索和分页
- 行操作：编辑、调试、删除

**ApiForm 弹窗**:
- 基础字段：接口名称、URL、请求方法（下拉选择）、描述
- 动态参数列表（Form.List）：
  - 参数名称：实时正则校验 `^[a-zA-Z_][a-zA-Z0-9_]*$`
  - 参数类型：11种类型下拉选择（string, bool, int, long, float, object, array<string>, array<int>, array<long>, array<float>, array<object>）
  - 参数说明
  - 是否必填（Switch 开关）
  - 参数位置（body / header）
  - 支持添加/删除参数行

**ApiImportOpenAPI 弹窗**:
- 格式选择器：YAML / JSON
- 文本域粘贴 OpenAPI 定义
- 解析预览：展示解析出的接口列表（名称、URL、方法、参数数量）
- 确认后批量导入

**ApiDebug 页面**（独立页面）:
- 接口信息卡片：方法标签、名称、URL、描述
- 动态参数表单：按 Header / Body 分组
  - bool 类型 → Switch 组件
  - 数值类型 → InputNumber 组件
  - object/array 类型 → TextArea（JSON 格式校验）
  - 其他 → Input 组件
- "发送请求"按钮
- 响应展示：状态码（颜色编码）、响应头、响应体（JSON 格式化）、耗时

### 6. 测试脚本管理

**文件**: `pages/Scripts/ScriptList.tsx` (196行), `ScriptUpload.tsx` (152行), `ScriptEditor.tsx` (313行)

**ScriptList 页面**:
- 双栏布局：左侧目录树（module="script"）+ 右侧脚本表格
- 表格列：脚本名称、语言（Tag）、文件大小（格式化显示）、更新时间、操作
- 行操作：编辑（跳转编辑器页）、删除

**ScriptUpload 弹窗**:
- 目录选择器（扁平化目录树）
- 拖拽上传组件，仅接受 .go / .py 文件，最大 10MB
- 自动根据文件后缀识别语言

**ScriptEditor 页面**（独立页面）:
- 顶部：返回按钮、脚本名称、语言标签、保存/调试运行按钮
- 中部：Monaco 编辑器（控制台可见时占 60% 高度）
- 底部：控制台面板（占 40% 高度）
  - 显示退出码、执行耗时
  - 输出内容和错误信息
- 调试运行时每 1 秒轮询执行结果（最多 30 次）

### 7. 自动化执行

**文件**: `pages/Execution/ExecutionCreate.tsx` (162行), `ExecutionDetail.tsx` (138行)

**ExecutionCreate 页面**:
- 脚本选择器（下拉选择）
- "开始执行"按钮
- 执行历史表格：状态（彩色标签）、用例统计、时间
- 点击行跳转到执行详情

**ExecutionDetail 页面**:
- 执行概要：状态标签、开始/结束时间、耗时
- 统计卡片：总用例数、通过（绿色）、失败（红色）、超时（橙色）、通过率
- 结果表格：用例ID、用例名称、状态（彩色 Tag）、耗时、输出、错误信息
- 自动轮询：状态为 running/pending 时每 3 秒刷新（useRef 避免闭包问题）
- "生成报告"按钮（执行完成后可见）
- "查看报告"链接（报告生成后可见）

### 8. 测试报告

**文件**: `pages/Reports/ReportList.tsx` (107行), `ReportDetail.tsx` (86行)

**ReportList 页面**:
- 表格列：报告ID、关联执行ID、格式（Tag）、文件大小、生成时间、操作
- 行操作：查看详情、下载
- 分页

**ReportDetail 页面**:
- 报告元数据：ID、执行ID（可点击跳转）、格式、文件大小、文件路径、创建时间
- "下载报告"按钮

## 状态管理设计 (Zustand)

### folderStore

| 状态 | 类型 | 说明 |
|------|------|------|
| caseFolders | FolderNode[] | 用例目录树 |
| scriptFolders | FolderNode[] | 脚本目录树 |
| loading | boolean | 加载状态 |

| 方法 | 说明 |
|------|------|
| loadCaseFolders() | 加载用例目录树 |
| loadScriptFolders() | 加载脚本目录树 |
| createFolder() | 创建目录 |
| renameFolder() | 重命名目录 |
| deleteFolder() | 删除目录 |

### caseStore

| 状态 | 类型 | 说明 |
|------|------|------|
| cases | TestCase[] | 用例列表 |
| total | number | 总数 |
| currentPage | number | 当前页 |
| pageSize | number | 每页条数 |
| selectedFolderId | number \| null | 选中的目录 |
| loading | boolean | 加载状态 |

| 方法 | 说明 |
|------|------|
| loadCases() | 加载用例列表（分页+目录筛选） |
| createCase() | 创建用例 |
| updateCase() | 更新用例 |
| deleteCase() | 删除用例 |
| importExcel() | Excel 导入 |
| setSelectedFolderId() | 切换目录 |

### apiStore

| 状态 | 类型 | 说明 |
|------|------|------|
| apis | TestAPI[] | 接口列表 |
| total | number | 总数 |
| keyword | string | 搜索关键词 |
| loading | boolean | 加载状态 |

| 方法 | 说明 |
|------|------|
| loadAPIs() | 加载接口列表（分页+搜索） |
| createAPI() | 创建接口 |
| updateAPI() | 更新接口 |
| deleteAPI() | 删除接口 |
| importOpenAPI() | OpenAPI 导入 |
| setKeyword() | 设置搜索关键词 |

### scriptStore

| 状态 | 类型 | 说明 |
|------|------|------|
| scripts | TestScript[] | 脚本列表 |
| currentScript | TestScript \| null | 当前编辑的脚本 |
| selectedFolderId | number \| null | 选中的目录 |
| loading | boolean | 加载状态 |

| 方法 | 说明 |
|------|------|
| loadScripts() | 加载脚本列表 |
| loadScriptById() | 加载单个脚本详情 |
| uploadScript() | 上传脚本 |
| updateScript() | 更新脚本内容 |
| deleteScript() | 删除脚本 |
| runScript() | 调试运行脚本 |

### executionStore

| 状态 | 类型 | 说明 |
|------|------|------|
| executions | Execution[] | 执行列表 |
| currentExecution | Execution \| null | 当前执行详情 |
| loading | boolean | 加载状态 |

| 方法 | 说明 |
|------|------|
| loadExecutions() | 加载执行列表 |
| loadExecutionById() | 加载执行详情 |
| createExecution() | 创建执行任务 |

## API 调用层设计

### Axios 实例配置

- baseURL: `/api/v1`
- 超时: 30 秒
- 响应拦截器: 校验 `code === 0`，非 0 时 reject 并提取错误信息

### 接口调用方法

所有 API 方法返回 `Promise`，统一使用 `request` 实例发起请求。各 store 在调用 API 后自动刷新列表数据。

## TypeScript 类型定义

### 核心类型

```typescript
FolderNode       // 目录节点（支持嵌套 children）
TestCase         // 测试用例
TestAPI          // 测试接口（含 params 数组）
APIParam         // 接口参数（11种类型、2种位置）
TestScript       // 测试脚本（Go/Python）
Execution        // 执行记录（含 results 数组）
ExecutionResult  // 执行结果明细
Report           // 测试报告
```

### 通用类型

```typescript
PageResponse<T>  // 分页响应: { items: T[], total: number }
ApiResponse<T>   // 统一响应: { code: number, message: string, data: T }
```

## 构建配置

### Vite 配置

- React 插件
- 开发代理: `/api` → `http://localhost:8080`（解决跨域）

### 依赖清单

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | 19.x | UI 框架 |
| react-router-dom | 7.x | 路由 |
| antd | 6.x | UI 组件库 |
| @ant-design/icons | - | 图标 |
| zustand | 5.x | 状态管理 |
| axios | 1.x | HTTP 客户端 |
| @monaco-editor/react | 4.x | 代码编辑器 |

## 启动方式

```bash
cd web
npm install
npm run dev
```

开发服务器将在 `http://localhost:5173` 启动，API 请求自动代理到后端 `http://localhost:8080`。

## 待优化项

1. 添加单元测试（Vitest + React Testing Library）
2. 添加 E2E 测试（Playwright）
3. 国际化支持（当前硬编码中文）
4. 暗色主题支持
5. 目录树拖拽排序
6. 表格列自定义显示/隐藏
7. 脚本执行 SSE 实时输出流
8. 响应式布局适配移动端
9. 错误边界（Error Boundary）处理
10. 性能优化（虚拟滚动、大列表优化）
