# renews_agent

本项目实现一个本地优先的 TypeScript coding agent framework，遵循 [`docs/RENEWS_AGENT_IMPLEMENTATION_SPEC.md`](docs/RENEWS_AGENT_IMPLEMENTATION_SPEC.md)。

## 目录

- `apps/cli`: CLI 入口
- `apps/service`: headless service
- `apps/vscode_adapter`: 轻量 VS Code adapter
- `packages/*`: 核心能力包
- `.renews`: rules / skills / workflows / checkpoints / index
- `examples`: E2E 示例仓库
- `tests`: 单元、集成与端到端测试

## 关键能力

- 结构化 plan / act 流程
- typed subagents
- 审批与安全策略
- SQLite 持久化
- Docker / process sandbox
- repo map / symbol index / hybrid retrieval
- checkpoint / resume
- CLI / service / IDE adapter

## 快速开始

```bash
pnpm install
pnpm build
pnpm test
pnpm cli task "修复 packages/core 中一个 failing test"
```

## 模型网关演示

仓库已经附带一套可直接连 OpenAI-compatible 模型网关的示例：

```bash
cp docs/renews.model-gateway.example.yaml renews.config.yaml
export MODEL_GATEWAY_URL="https://your-gateway.example.com/v1"
export MODEL_GATEWAY_KEY="your-secret-key"
export SEARCH_API_URL="https://your-search.example.com"
export SEARCH_API_KEY="your-search-key"
pnpm gateway:smoke --role planner "请输出 JSON：{\"ok\":true,\"message\":\"gateway works\"}"
pnpm cli plan "为 packages/context 增加一个增量解析测试"
```

完整说明见 `docs/MODEL_GATEWAY_QUICKSTART.md`。

## CLI 打包

项目根目录提供了一键打包脚本：

```bash
./package-cli.sh mac
./package-cli.sh linux
./package-cli.sh all
```

说明：

- `mac` 会打包当前宿主架构对应的 macOS CLI 包
- `linux` 会通过 Docker 打包 Linux CLI 包
- 产物输出到 `artifacts/`
- 分发包需要目标机器已安装 Node.js 22+

## 配置

默认配置文件为 `renews.config.yaml`。

模型和搜索均通过环境变量注入凭据，敏感信息不会进入普通日志。
