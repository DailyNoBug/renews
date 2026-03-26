# Architecture Overview

`renews_agent` 采用本地优先的分层架构：

1. `apps/cli`
   负责交互式任务执行、状态查看、checkpoint 恢复和配置校验。
2. `apps/service`
   提供 REST + SSE 接口，供 IDE adapter 或上层平台使用。
3. `packages/core`
   包含 runtime、状态机、审批、checkpoint、event bus 和 bootstrap。
4. `packages/storage`
   基于 SQLite 的 repository 层和迁移。
5. `packages/model`
   模型网关、结构化输出解析和 prompt 组合器。
6. `packages/sandbox`
   Docker / process sandbox。
7. `packages/workspace`
   文件系统、patch、diff、git 只读和仓库树。
8. `packages/context`
   tree-sitter manager、symbol index、repo map 和 hybrid retrieval。
9. `packages/agents`
   Planner / Architect / Editor / Tester / Reviewer / Supervisor。
10. `packages/memory`
    rules / skills / workflows / session memory / project memory。

## 运行流

1. CLI 或 service 创建 session
2. Supervisor 进入 plan mode
3. Context engine 组装 repo map、retrieval、rules、skills、workflow hints
4. Planner 输出结构化计划
5. 进入 act mode 前等待审批
6. Architect 生成 EditInstruction
7. Editor 申请写权限并应用 patch
8. Checkpoint service 保存内容寻址快照
9. Tester 申请命令权限并执行验证
10. Reviewer 输出 review 结论
11. Runtime 汇总最终结果

## 安全边界

- 默认 Docker sandbox
- 写文件和执行命令走统一 ApprovalService
- `.git`、`.env`、`node_modules` 为保护路径
- 危险命令通过 deny list 阻止

## 扩展点

- SearchProvider
- MCP client
- richer VS Code UX
- 更强的 tree-sitter 语言支持
- 更完整的 benchmark harness
