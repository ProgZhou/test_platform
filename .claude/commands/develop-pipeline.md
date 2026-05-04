---
description: 启动 SDD 开发流水线，按照产品分析→架构设计→代码开发→测试执行的流程管理需求开发
---

# SDD 开发流水线

你是一个流程编排器，负责管理从需求到交付的完整 SDD 流程。当前变更 ID 为：`$ARGUMENTS`

## 执行流程

### 第 0 步：初始化变更
1. 如果没有提供 `$ARGUMENTS`，询问用户：“请提供变更 ID（例如：user-login-20240401）”
2. 创建目录结构：
```text
sdd/changes/{change-id}/
├── meta.json
├── product.md
├── design.md
├── tasks/
├── code-review/
└── test/
```

3. 初始化 `meta.json`：
```json
{
  "change_id": "{change-id}",
  "created_at": "{timestamp}",
  "phases": {
    "product": "pending",
    "design": "pending",
    "test_design": "pending",
    "implementation": "pending",
    "code_review": "pending",
    "test_execution": "pending"
  },
  "current_phase": "product"
}
```

### 第 1 步：产品需求分析
1. 启动 `product-analyst` 子代理，输入用户需求
2. 子代理产出 sdd/changes/{change-id}/product.md
3. 暂停流水线，向用户展示需求文档摘要
4. 等待用户确认：回复“确认”继续，或提出修改意见

### 第 2 步：并行设计与测试设计
用户确认需求后，同时启动两个子代理：
1. 架构设计：启动 `architect` 子代理
    - 输入：`product.md`
    - 产出：`design.md` + `tasks/frontend.md` + `tasks/backend.md`

2. 测试设计：启动 `test-designer` 子代理
    - 输入：`product.md`
    - 产出：`test/design.md` + `test/cases.md`

两个子代理并行执行，等待两者都完成后：
- 更新 `meta.json` 中 `design` 和 `test_design` 状态为 `completed`
- 停止流水线，向用户展示设计文档和测试方案摘要
- 等待用户确认：回复“确认设计”或提出修改

### 第 3 步：代码开发
用户确认设计后，根据需求类型选择性启动：
- 如果涉及前端：启动 `frontend-dev` 子代理
    - 输入：`design.md` 前端部分 + tasks/frontend.md
    - 产出：前端代码 + 更新 tasks/frontend.md 勾选完成项
- 如果涉及后端：启动 `backend-dev` 子代理
    - 输入：`design.md` 后端部分 + tasks/backend.md
    - 产出：后端代码 + 更新 tasks/backend.md 勾选完成项
        
前后端开发可以并行执行，等待所有启用的子代理完成。

### 第 4 步：代码评审
开发完成后，启动 code-reviewer 子代理：
- 输入：design.md + 实际代码变更
- 产出：code-review/frontend.md 和 code-review/backend.md

**评审报告包含**：
- 是否符合设计文档
- 代码质量问题
- 安全性检查
- 性能建议

暂停流水线，向用户展示评审报告，询问：“是否继续测试？(回复‘继续测试’或‘修复问题’)”

### 第 5 步：测试执行
用户确认测试后：

1. 启动`test-executor` 子代理
    - 输入：test/cases.md + 代码
    - 执行测试（单元测试、集成测试）
    - 产出：test/report.md

2. 更新 `meta.json` 中 test_execution 状态为 completed

### 第 6 步：归档
测试通过后：
1. 将 specs/{feature-name}.md 从 design.md 提取核心规范
2. 更新 memory/memory.md 记录本次变更
3. 询问用户：“流水线完成，是否归档当前变更？”

## 辅助命令
- `/pipeline status`：查看当前变更的状态
- `/pipeline continue`：继续执行暂停的流水线
- `/pipeline rollback`：回滚到上一个阶段


$ARGUMENTS