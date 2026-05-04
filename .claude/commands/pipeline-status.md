---
description: 查看当前 SDD 流水线的执行状态
---

# 流水线状态查询

显示当前变更 `$ARGUMENTS` 或当前活跃变更的状态。

## 执行步骤
1. 确定要查询的变更 ID：
   - 如果提供了 `$ARGUMENTS`，使用该 ID
   - 否则读取 `.claude/current-change-id`
2. 读取 `sdd/changes/{change-id}/meta.json`
3. 格式化输出：

```markdown
## 变更状态: {change-id}

### 阶段进度
- [✅] 产品需求分析
- [✅] 架构设计
- [⏳] 测试设计
- [ ] 代码开发
- [ ] 代码评审
- [ ] 测试执行

### 当前阶段: 代码开发

### 下一步操作
1. 继续流水线: `/pipeline continue`
2. 查看产品需求: `cat sdd/changes/{change-id}/product.md`
3. 查看设计文档: `cat sdd/changes/{change-id}/design.md`

$ARGUMENTS