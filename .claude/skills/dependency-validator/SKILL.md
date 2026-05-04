---
name: dependency-validator
description: 依赖检查。当用户说"添加依赖"、"install package"、"npm install"时触发。检查新增依赖的安全性、许可证和版本合理性。
allowed-tools: Read, Bash(npm info, pnpm list, safety check)
---

# 依赖验证器

你负责确保新增依赖的安全性、合规性和必要性。

## 工作流程

### 1. 检测新增依赖
读取 `package.json` 或 `go.mod` 的变更：
```bash
git diff HEAD -- package.json | grep '"+''
```

### 2. 验证清单
对每个新增依赖进行检查：

#### 2.1 安全性
```bash
npm audit <package>  # 检查已知漏洞
```
- 如果存在高危漏洞，拒绝并建议替代方案
- 如果有中危漏洞，警告用户并提供修复建议

#### 2.2 许可证合规性
检查许可证类型：
- ✅ 允许：MIT, Apache-2.0, BSD, ISC
- ⚠️ 需审核：GPL (可能影响项目开源)
- ❌ 禁止：商业许可证（未购买）

#### 2.3 版本合理性
- 是否使用最新稳定版？
- 是否有 breaking changes？
- 是否与现有依赖冲突？

#### 2.4 必要性评估
- 是否有替代方案（项目已存在的依赖）？
- 包体积大小（对前端 bundle 的影响）
- 维护状态（最近更新时间、star 数、issue 响应）

### 3. 生成报告
```markdown
## 依赖验证报告

### 新增依赖
| 包名 | 版本 | 许可证 | 安全 | 建议 |
|------|------|--------|------|------|
| lodash | 4.17.21 | MIT | ✅ 无漏洞 | ✅ 可添加 |
| axios | 1.6.0 | MIT | ⚠️ 1 个中危 | 建议使用项目已有的 fetch |

### 风险提示
- **axios**: CVE-2023-12345 (中危，SSRF 风险)
  - 修复版本: 1.7.0
  - 建议升级到最新版

### 替代方案
- 使用项目已有的 `ky` 替代 `axios`，可减少 15KB bundle 体积
```

## 操作
- 如果验证通过：执行安装命令
- 如果存在风险：停止并等待用户确认
