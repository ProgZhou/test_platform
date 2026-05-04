---
description: 继续执行暂停的 SDD 流水线
---

# 继续流水线

从当前变更的暂停点继续执行。

## 执行步骤
1. 读取 `.claude/current-change-id` 获取当前变更 ID
2. 读取 `sdd/changes/{change-id}/meta.json` 获取状态
3. 根据 `current_phase` 和各个 `phases` 状态，跳转到对应阶段继续执行