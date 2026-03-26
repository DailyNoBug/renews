---
name: backend_rules
priority: 80
appliesTo:
  - "packages/**"
---

- 禁止直接修改生成代码
- 新增 API 必须补单元测试
- 不允许引入新的全局状态
