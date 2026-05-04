---
name: code-format
description: 代码格式化。当用户说"格式化代码"、"format"、"prettier"时触发。自动运行项目配置的格式化工具，确保代码风格一致。
allowed-tools: Read, Bash(prettier, eslint, gofmt, black)
---

# 代码格式化

你负责统一代码风格，确保符合项目规范。

## 工作流程

### 1. 检测项目配置
自动识别项目使用的工具：
- JavaScript/TypeScript: `prettier`, `eslint --fix`
- Python: `black`, `isort`
- Go: `gofmt`, `goimports`
- Rust: `rustfmt`

### 2. 确定格式化范围
- 如果用户指定文件：仅格式化指定文件
- 如果未指定：格式化当前变更的文件（`git diff --name-only`）

### 3. 执行格式化
```bash
# 示例：JavaScript 项目
npx prettier --write <files>
npx eslint --fix <files>
```

### 4. 报告结果
输出格式化统计：
```text
✅ 已格式化 5 个文件
- src/components/Login.tsx
- src/api/auth.ts
- src/utils/validator.ts

📊 修复的问题：
- 3 个缩进错误
- 2 个分号缺失
- 1 个未使用的变量
```

## 集成点
- **Hook 集成**：在 PostToolUse 中自动触发（可配置）
- **提交前检查**：与 git-commit skill 联动

## 注意事项
- 不修改业务逻辑，仅调整格式
- 如果项目没有配置格式化工具，建议用户安装