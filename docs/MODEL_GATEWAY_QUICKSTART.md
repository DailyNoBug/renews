# Model Gateway Quickstart

这份文档给出一套可直接连 OpenAI-compatible 模型网关的演示配置和运行示例。

## 1. 准备环境变量

```bash
export MODEL_GATEWAY_URL="https://your-gateway.example.com/v1"
export MODEL_GATEWAY_KEY="your-secret-key"
export SEARCH_API_URL="https://your-search.example.com"
export SEARCH_API_KEY="your-search-key"
```

## 2. 使用演示配置

```bash
cp docs/renews.model-gateway.example.yaml renews.config.yaml
```

如果你想保留项目当前配置，也可以单独查看这份示例文件，把 `models` / `search` 段合并进自己的 `renews.config.yaml`。

## 3. 先做网关 smoke test

```bash
pnpm gateway:smoke --role planner "请输出 JSON：{\"ok\":true,\"message\":\"gateway works\"}"
```

如果返回了合法 JSON，说明：

- 配置已被正确加载
- API key 环境变量已生效
- OpenAI-compatible 网关可被 `OpenAICompatibleModelClient` 正常调用
- `StructuredOutputParser` 可以稳定解析结构化输出

## 4. 运行 plan / task 示例

```bash
pnpm cli plan "为 packages/core 新增一个 checkpoint 相关测试"
pnpm cli task "为 packages/core 新增一个 checkpoint 相关测试"
```

如果你要用 JSON 模式对接外部系统：

```bash
pnpm cli task "修复 packages/context 中的解析问题" --headless --json
```

## 5. 常见问题

- `Missing environment variable`
  说明 `MODEL_GATEWAY_URL`、`MODEL_GATEWAY_KEY`、`SEARCH_API_URL` 或 `SEARCH_API_KEY` 没有设置。
- `Failed to parse structured model output`
  说明网关背后的模型没有按 schema 返回 JSON，可以先用 `pnpm gateway:smoke` 单独验证。
- 需要完全本地开发
  可以不配置模型网关，此时 framework 仍能用本地启发式 fallback 跑通大部分 orchestration。
