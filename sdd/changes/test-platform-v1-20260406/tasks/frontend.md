# 前端开发任务清单

## 基础设施

- [ ] 任务 F-01: 初始化前端项目（Vite + React + TypeScript + Ant Design）
  - 涉及文件: `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`
  - 依赖: 无

- [ ] 任务 F-02: 配置路由和布局组件
  - 涉及文件: `web/src/App.tsx`, `web/src/main.tsx`, `web/src/components/Layout/AppLayout.tsx`
  - 依赖: F-01

- [ ] 任务 F-03: 定义 TypeScript 类型和 API 调用层
  - 涉及文件: `web/src/types/index.ts`, `web/src/api/cases.ts`, `web/src/api/apis.ts`, `web/src/api/scripts.ts`, `web/src/api/execution.ts`, `web/src/api/reports.ts`
  - 依赖: F-01

## 目录树组件（共用）

- [ ] 任务 F-04: 实现目录树组件（支持多级嵌套、展开/折叠、右键菜单）
  - 涉及文件: `web/src/components/FolderTree/FolderTree.tsx`, `web/src/components/FolderTree/FolderTreeNode.tsx`
  - 依赖: F-02, F-03

- [ ] 任务 F-05: 实现目录树拖拽排序
  - 涉及文件: `web/src/components/FolderTree/FolderTree.tsx`
  - 依赖: F-04

- [ ] 任务 F-06: 实现 Zustand folderStore 状态管理
  - 涉及文件: `web/src/stores/folderStore.ts`
  - 依赖: F-03, F-04

## 测试用例管理

- [ ] 任务 F-07: 实现用例列表页（分页、搜索、筛选）
  - 涉及文件: `web/src/pages/Cases/CaseList.tsx`, `web/src/stores/caseStore.ts`
  - 依赖: F-04, F-06

- [ ] 任务 F-08: 实现用例创建/编辑表单
  - 涉及文件: `web/src/pages/Cases/CaseForm.tsx`
  - 依赖: F-07

- [ ] 任务 F-09: 实现 Excel 导入功能（上传、错误提示、模板下载）
  - 涉及文件: `web/src/pages/Cases/CaseImport.tsx`
  - 依赖: F-07

- [ ] 任务 F-10: 实现用例删除（单条+批量，二次确认弹窗）
  - 涉及文件: `web/src/pages/Cases/CaseList.tsx`
  - 依赖: F-07

## 测试接口管理

- [ ] 任务 F-11: 实现接口列表页（分页、搜索）
  - 涉及文件: `web/src/pages/Apis/ApiList.tsx`
  - 依赖: F-02, F-03

- [ ] 任务 F-12: 实现接口表单录入（含参数编辑器，参数名正则校验）
  - 涉及文件: `web/src/pages/Apis/ApiForm.tsx`, `web/src/pages/Apis/ParamEditor.tsx`, `web/src/utils/validators.ts`
  - 依赖: F-11

- [ ] 任务 F-13: 实现 OpenAPI 导入功能（YAML/JSON 粘贴、解析、错误提示）
  - 涉及文件: `web/src/pages/Apis/ApiImport.tsx`, `web/src/utils/openapi-parser.ts`
  - 依赖: F-11

- [ ] 任务 F-14: 实现接口在线调试页面（参数填写、发送请求、响应展示）
  - 涉及文件: `web/src/pages/Apis/ApiDebug.tsx`
  - 依赖: F-12

- [ ] 任务 F-15: 实现接口编辑和删除
  - 涉及文件: `web/src/pages/Apis/ApiList.tsx`, `web/src/pages/Apis/ApiForm.tsx`
  - 依赖: F-12

## 测试脚本管理

- [ ] 任务 F-16: 实现脚本列表页（目录树+列表）
  - 涉及文件: `web/src/pages/Scripts/ScriptList.tsx`
  - 依赖: F-04, F-06

- [ ] 任务 F-17: 实现脚本上传功能（文件类型校验 .go/.py，大小校验 ≤10MB）
  - 涉及文件: `web/src/pages/Scripts/ScriptUpload.tsx`
  - 依赖: F-16

- [ ] 任务 F-18: 实现脚本在线编辑器（Monaco Editor，语法高亮）
  - 涉及文件: `web/src/pages/Scripts/ScriptEditor.tsx`, `web/src/components/CodeEditor/CodeEditor.tsx`
  - 依赖: F-16

- [ ] 任务 F-19: 实现脚本在线调试（执行+控制台输出 SSE）
  - 涉及文件: `web/src/pages/Scripts/ScriptEditor.tsx`
  - 依赖: F-18

## 自动化执行

- [ ] 任务 F-20: 实现执行任务创建页（选择用例+脚本，执行前校验）
  - 涉及文件: `web/src/pages/Execution/ExecutionCreate.tsx`, `web/src/stores/executionStore.ts`
  - 依赖: F-07, F-16

- [ ] 任务 F-21: 实现执行详情页（进度展示、结果列表）
  - 涉及文件: `web/src/pages/Execution/ExecutionDetail.tsx`
  - 依赖: F-20

## 测试报告

- [ ] 任务 F-22: 实现报告列表页
  - 涉及文件: `web/src/pages/Reports/ReportList.tsx`
  - 依赖: F-02, F-03

- [ ] 任务 F-23: 实现报告详情页和下载功能
  - 涉及文件: `web/src/pages/Reports/ReportDetail.tsx`
  - 依赖: F-22
