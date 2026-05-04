---
name: git-commit
description: 规范化 Git 提交。当用户说"提交代码"、"commit"、"生成提交信息"时触发。自动生成符合 Conventional Commits 规范的提交信息，并关联当前变更 ID。
allowed-tools: Read, Bash(git status, git add, git commit)
---

# Git 规范化提交

你是一个 Git 提交助手，负责生成规范化的提交信息。

## 工作流程

### 1. 检查当前状态
```bash
git status --short
git diff --cached --stat
```

### 2. 确定变更类型
根据代码变更自动推断类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变更

### 3. 生成提交信息
格式：`<type>(<scope>): <subject> [关联变更]`
示例：
```text
feat(auth): 添加手机验证码登录功能 [change: user-login-20240401]
- 实现验证码发送接口
- 添加 Redis 缓存验证码
- 前端新增登录表单组件
Ref: sdd/changes/user-login-20240401
```

### 4. 执行提交
**此步骤执行之前需要得到用户的确认**
```bash
git add .
git commit -m "<生成的提交信息>"
```

## 特殊场景
1. **合并提交**：如果有多个小提交，询问是否 squash
2. **关联变更**：自动读取 `.claude/current-change-id` 关联到提交信息
3. **预提交检查**：如果配置了 pre-commit hook，自动运行

## 注意事项
- 不要自动 push，让用户手动执行
- 如果变更 ID 未设置，提醒用户设置
