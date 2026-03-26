下面是**可直接交给 Codex 实现**的完整文字版规格书。你可以直接复制保存为：

`RENEWS_AGENT_IMPLEMENTATION_SPEC.md`

---

# RENEWS_AGENT_IMPLEMENTATION_SPEC

版本：v1.0
状态：可实施规格书
目标读者：Codex / 工程实现者 / 架构负责人
语言：中文
主实现语言：**TypeScript（Node.js 22+）**
项目名：`renews_agent`

---

# 1. 文档目标

本文档定义一个名为 **renews_agent** 的 agent 框架实现规格。
该框架面向**大型工程代码开发**，要求：

* 通过**第三方模型 API 网关**调用模型
* **除联网搜索外，所有 agent 核心能力都在本地实现**
* 用于真实软件工程任务，而不是玩具对话代理
* 吸收当前开源 coding agent / agent framework 中最有效的机制
* 避免已知设计陷阱
* 让 Codex 能按本文档**从零实现完整系统**

本文档不是概念介绍，而是**工程实现规范**。
实现时必须以本文档为准。

---

# 2. 产品定义

## 2.1 产品定位

`renews_agent` 是一个**本地优先、工程优先、可恢复、可审计**的 coding agent framework。

它不是：

* 一个纯聊天机器人
* 一个依赖某个现成 agent 框架二次封装的壳
* 一个必须联网才能工作的系统
* 一个只适合小仓库的 demo

它必须能够在中大型真实仓库中完成以下流程：

1. 理解任务
2. 建立计划
3. 读取仓库上下文
4. 精准修改代码
5. 运行 lint / test / build
6. 自动修复失败
7. 等待审批
8. 记录过程
9. 中断恢复
10. 输出最终变更与说明

---

# 3. 范围与边界

## 3.1 必须本地实现的能力

以下能力必须本地实现：

* agent runtime / orchestration
* session / state / checkpoint / resume
* 文件读写
* patch 生成与应用
* shell 命令执行
* git 读操作与安全写操作
* lint / test / build runner
* tree-sitter 代码解析
* repo map
* 符号索引
* 混合检索
* 规则系统
* 技能系统
* 工作流系统
* 会话记忆与项目记忆
* approvals / permission policy
* Docker 沙箱
* process sandbox（仅开发模式）
* MCP client
* CLI
* headless service
* IDE adapter
* SQLite 持久化
* tracing / logging / evals

## 3.2 不在本地实现的能力

以下能力**不做本地实现**：

* 联网搜索
* 模型推理本身
* 公网网页抓取/自建搜索引擎

联网搜索必须通过可替换的外部 `SearchProvider` 实现。

## 3.3 非目标

v1 不做：

* 自由群聊式多 agent 网络
* 全自动无人审批破坏性执行
* 分布式多机调度
* 强依赖向量数据库
* 浏览器自动化作为核心路径
* GUI-first 产品
* 自动化 PR 平台集成作为硬依赖
* 云端托管版

---

# 4. 核心设计原则

## 4.1 单内核，自研优先

不得以某个外部 agent 框架作为底层强依赖。
可以借鉴其模式，但运行时、状态机、数据模型、工具系统必须自研。

## 4.2 本地优先

除模型调用和联网搜索外，所有能力应尽量本地化，确保：

* 可控
* 可审计
* 可复现
* 可离线开发
* 可在私有代码库运行

## 4.3 大仓库优先

必须优先解决大仓库问题，而不是先做多 agent 花活。
上下文能力比对话能力更重要。

## 4.4 计划和执行分离

必须显式区分：

* `Plan Mode`
* `Act Mode`

计划阶段不允许写文件和执行破坏性命令。

## 4.5 设计与编辑分离

复杂代码修改必须拆成两个阶段：

* `Architect`：分析与设计修改策略
* `Editor`：实际生成 patch / 文件修改

## 4.6 可中断、可恢复

每一步都应：

* 可持久化
* 可暂停
* 可恢复
* 可审计

## 4.7 安全默认值

默认应偏安全：

* 只读允许
* 写操作需审批
* 网络访问需审批
* 破坏性命令拒绝

## 4.8 明确约束优于隐式魔法

* 工具必须有 schema
* handoff 必须 typed
* 计划必须结构化
* 输出必须可验证

---

# 5. 技术选型

## 5.1 主技术栈

* 语言：TypeScript
* 运行时：Node.js 22+
* 包管理：pnpm
* 构建：tsup 或 tsx + tsc
* 测试：vitest
* lint：eslint
* formatting：prettier
* 数据库：SQLite
* SQL 层：drizzle 或更轻量自定义 migration
* 代码解析：tree-sitter
* sandbox：Docker
* IPC / 进程：Node child_process / execa
* YAML：yaml
* JSON Schema：zod + zod-to-json-schema 或 typebox
* 日志：pino
* tracing：自定义 event log + OpenTelemetry 兼容接口（v1 可选）

## 5.2 为什么选 TypeScript

必须使用 TypeScript，原因：

* 适合 CLI / service / IDE adapter / MCP
* 适合子进程管理、流式 I/O、工具编排
* 类型系统足够支撑复杂 contract
* 对本地 agent runtime 更合适

---

# 6. 总体架构

`renews_agent` 采用以下架构：

```text
User / IDE / CLI
    ↓
Supervisor Runtime
    ↓
State Machine + Scheduler + Approval Engine + Checkpoint Engine
    ↓
Agent Roles (Planner / Architect / Editor / Reviewer / Tester / Searcher)
    ↓
Context Engine + Memory + Rules + Skills + Workflows
    ↓
Tool System (Builtin Tools / MCP Tools / Remote Tools)
    ↓
Sandbox (Docker / Process)
    ↓
Workspace / Git / Filesystem / Tests / External Search API / Model Gateway
```

---

# 7. Monorepo 目录结构

必须按以下结构组织项目：

```text
renews_agent/
  apps/
    cli/
      src/
        main.ts
        commands/
    service/
      src/
        server.ts
        routes/
    vscode_adapter/
      src/
        extension.ts

  packages/
    core/
      src/
        runtime/
        scheduler/
        state/
        approvals/
        checkpoints/
        events/
        errors/
        types/

    model/
      src/
        client/
        providers/
        prompt/
        parser/
        streaming/

    sandbox/
      src/
        base/
        docker/
        process/
        remote/

    workspace/
      src/
        fs/
        diff/
        patch/
        git/
        watch/
        repo/

    context/
      src/
        repomap/
        treesitter/
        index/
        retrieval/
        ranking/
        summarization/

    tools/
      src/
        builtin/
          file/
          shell/
          grep/
          git/
          patch/
          test/
          repo/
          approval/
        mcp/
        remote/
          search/

    agents/
      src/
        supervisor/
        planner/
        architect/
        editor/
        reviewer/
        tester/
        searcher/

    memory/
      src/
        session/
        project/
        summary/
        rules/
        skills/
        workflows/

    storage/
      src/
        sqlite/
        migrations/
        repositories/

    tracing/
      src/

    evals/
      src/
        harness/
        datasets/
        metrics/

    config/
      src/

    shared/
      src/
        schema/
        utils/
        constants/

  docs/
  examples/
  scripts/
  .renews/
    rules/
    skills/
    workflows/

  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

---

# 8. 核心数据模型

---

## 8.1 Session

```ts
export interface TaskSession {
  id: string;
  workspaceRoot: string;
  repoRoot?: string;
  userGoal: string;
  mode: "plan" | "act";
  status:
    | "idle"
    | "planning"
    | "awaiting_approval"
    | "executing"
    | "validating"
    | "reviewing"
    | "completed"
    | "failed"
    | "blocked"
    | "cancelled";
  currentPlanId?: string;
  currentCheckpointId?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 8.2 Plan

```ts
export interface ExecutionPlan {
  id: string;
  sessionId: string;
  summary: string;
  assumptions: string[];
  risks: string[];
  requiresApproval: boolean;
  steps: PlanStep[];
  createdAt: string;
}

export interface PlanStep {
  id: string;
  title: string;
  goal: string;
  editablePaths?: string[];
  validationTargets?: string[];
  toolIntents: string[];
  dependsOn?: string[];
  status: "todo" | "doing" | "done" | "failed" | "skipped";
}
```

## 8.3 ContextBundle

```ts
export interface ContextBundle {
  taskSummary: string;
  activeFiles: FileSnippet[];
  repoMap: RepoMap;
  symbolHits: SymbolHit[];
  retrievalHits: RetrievalHit[];
  recentHistorySummary: string;
  rules: RuleDoc[];
  skills: SkillDoc[];
  workflowHints: WorkflowHint[];
  validationContext?: ValidationContext;
}
```

## 8.4 Tool

```ts
export interface Tool<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  permission: PermissionPolicy;
  run(ctx: ToolContext, args: TArgs): Promise<TResult>;
}
```

## 8.5 Approval

```ts
export type ApprovalAction =
  | "write_file"
  | "delete_file"
  | "run_command"
  | "install_dependency"
  | "git_commit"
  | "network_request"
  | "use_remote_search";

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  action: ApprovalAction;
  payload: Record<string, unknown>;
  risk: "low" | "medium" | "high";
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
}
```

## 8.6 Checkpoint

```ts
export interface Checkpoint {
  id: string;
  sessionId: string;
  parentId?: string;
  label: string;
  manifestHash: string;
  createdAt: string;
}
```

## 8.7 AgentHandoff

```ts
export interface AgentHandoff<I, O> {
  from:
    | "supervisor"
    | "planner"
    | "architect"
    | "editor"
    | "reviewer"
    | "tester"
    | "searcher";
  to:
    | "supervisor"
    | "planner"
    | "architect"
    | "editor"
    | "reviewer"
    | "tester"
    | "searcher";
  reason: string;
  input: I;
  outputSchema: JsonSchema;
}
```

---

# 9. 状态机

必须实现以下状态机：

```text
idle
-> planning
-> awaiting_approval
-> executing
-> validating
-> reviewing
-> completed

异常路径：
planning -> failed
executing -> failed
validating -> executing   (repair loop)
validating -> failed
reviewing -> executing    (review changes requested)
任意状态 -> blocked
任意状态 -> cancelled
任意状态 -> awaiting_approval
```

## 9.1 状态定义

* `idle`：刚创建 session，未开始
* `planning`：正在制定计划
* `awaiting_approval`：等待用户审批
* `executing`：正在执行计划步骤
* `validating`：正在 lint/test/build 验证
* `reviewing`：进行最终审查
* `completed`：完成
* `failed`：失败且不可自动恢复
* `blocked`：缺失必要条件
* `cancelled`：用户取消

## 9.2 关键事件

必须支持：

* `SESSION_CREATED`
* `PLAN_STARTED`
* `PLAN_COMPLETED`
* `APPROVAL_REQUESTED`
* `APPROVAL_GRANTED`
* `APPROVAL_REJECTED`
* `STEP_STARTED`
* `STEP_COMPLETED`
* `STEP_FAILED`
* `TOOL_CALLED`
* `TOOL_SUCCEEDED`
* `TOOL_FAILED`
* `CHECKPOINT_CREATED`
* `CHECKPOINT_RESTORED`
* `VALIDATION_STARTED`
* `VALIDATION_PASSED`
* `VALIDATION_FAILED`
* `REPAIR_LOOP_STARTED`
* `RUN_COMPLETED`
* `RUN_FAILED`
* `RUN_BLOCKED`
* `RUN_CANCELLED`

---

# 10. 持久化与数据库设计

必须使用 SQLite。
v1 不允许依赖外部数据库才能运行。

## 10.1 表清单

必须实现至少以下表：

* `sessions`
* `plans`
* `plan_steps`
* `events`
* `tool_calls`
* `approvals`
* `checkpoints`
* `artifacts`
* `memories`
* `rules`
* `skills`
* `workflow_runs`
* `validation_runs`

## 10.2 SQL 参考定义

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  workspace_root TEXT NOT NULL,
  repo_root TEXT,
  user_goal TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  current_plan_id TEXT,
  current_checkpoint_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  assumptions_json TEXT NOT NULL,
  risks_json TEXT NOT NULL,
  requires_approval INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE plan_steps (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  editable_paths_json TEXT,
  validation_targets_json TEXT,
  tool_intents_json TEXT NOT NULL,
  depends_on_json TEXT,
  status TEXT NOT NULL,
  sort_index INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  run_id TEXT,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  step_id TEXT,
  tool_name TEXT NOT NULL,
  args_json TEXT NOT NULL,
  result_json TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  risk TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  parent_id TEXT,
  label TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE validation_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  step_id TEXT,
  command TEXT NOT NULL,
  exit_code INTEGER,
  stdout_path TEXT,
  stderr_path TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

## 10.3 存储层要求

必须实现 repository 模式：

* `SessionRepository`
* `PlanRepository`
* `EventRepository`
* `ApprovalRepository`
* `CheckpointRepository`
* `MemoryRepository`
* `ValidationRepository`

所有写操作必须：

* 原子化
* 带事件记录
* 可回放

---

# 11. 配置系统

配置文件名：`renews.config.yaml`

## 11.1 配置加载优先级

优先级从高到低：

1. CLI flags
2. environment variables
3. project `renews.config.yaml`
4. user config
5. defaults

## 11.2 配置示例

```yaml
project:
  name: renews_agent
  workspaceRoot: .
  defaultMode: plan

models:
  planner:
    provider: openai_compatible
    baseURL: ${MODEL_GATEWAY_URL}
    apiKeyEnv: MODEL_GATEWAY_KEY
    model: planner-large
    maxOutputTokens: 8192
    temperature: 0.2

  executor:
    provider: openai_compatible
    baseURL: ${MODEL_GATEWAY_URL}
    apiKeyEnv: MODEL_GATEWAY_KEY
    model: coder-main
    maxOutputTokens: 8192
    temperature: 0.1

  editor:
    provider: openai_compatible
    baseURL: ${MODEL_GATEWAY_URL}
    apiKeyEnv: MODEL_GATEWAY_KEY
    model: coder-fast
    maxOutputTokens: 8192
    temperature: 0.0

  reviewer:
    provider: openai_compatible
    baseURL: ${MODEL_GATEWAY_URL}
    apiKeyEnv: MODEL_GATEWAY_KEY
    model: reviewer-main
    maxOutputTokens: 4096
    temperature: 0.1

sandbox:
  provider: docker
  image: renews-agent:base
  network: restricted
  writablePaths:
    - .
  blockedCommands:
    - rm -rf /
    - shutdown
    - reboot
    - mkfs
    - dd if=

approvals:
  default: ask
  allowReadOnlyToolsWithoutApproval: true
  requireApprovalFor:
    - write_file
    - delete_file
    - run_command
    - install_dependency
    - git_commit
    - network_request
    - use_remote_search

context:
  repoMap:
    enabled: true
    maxSymbols: 1200
  retrieval:
    strategy: hybrid
    useEmbeddings: false
    topK: 20
  treeSitter:
    enabled: true

search:
  provider: remote
  apiBaseURL: ${SEARCH_API_URL}
  apiKeyEnv: SEARCH_API_KEY
  maxResults: 8

rules:
  paths:
    - .renews/rules

skills:
  paths:
    - .renews/skills

workflows:
  paths:
    - .renews/workflows
```

## 11.3 配置要求

* 所有配置必须有 schema 校验
* 所有环境变量缺失时必须报清晰错误
* 所有未知字段必须告警
* 敏感配置不得写入普通日志

---

# 12. 模型网关层

---

## 12.1 设计目标

模型层必须：

* 完全 provider-agnostic
* 支持第三方 API 网关
* 支持 streaming
* 支持结构化输出
* 支持重试
* 支持限流
* 支持多模型角色

## 12.2 抽象接口

```ts
export interface ModelRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ModelToolSpec[];
  responseFormat?: "text" | "json";
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelResponse {
  message: AssistantMessage;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
}

export interface ModelEvent {
  type: "message_delta" | "tool_call" | "done" | "error";
  data: unknown;
}

export interface ModelClient {
  invoke(req: ModelRequest): Promise<ModelResponse>;
  stream(req: ModelRequest): AsyncIterable<ModelEvent>;
}
```

## 12.3 Provider 实现

v1 必须实现：

* `OpenAICompatibleModelClient`

可选接口预留：

* `AnthropicCompatibleModelClient`
* `CustomHttpModelClient`

## 12.4 模型角色

必须支持角色级模型配置：

* `planner`
* `executor`
* `editor`
* `reviewer`
* `tester`
* `summarizer`
* `fast`

## 12.5 结构化输出

所有关键 agent 输出必须走结构化解析。

必须实现：

* zod schema
* JSON 模式校验
* 修复性重试（当输出不合法时）

示例：

```ts
const PlanSchema = z.object({
  summary: z.string(),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
  requiresApproval: z.boolean(),
  steps: z.array(
    z.object({
      title: z.string(),
      goal: z.string(),
      editablePaths: z.array(z.string()).optional(),
      validationTargets: z.array(z.string()).optional(),
      toolIntents: z.array(z.string()),
    }),
  ),
});
```

## 12.6 错误处理

必须处理：

* timeout
* 429
* 5xx
* malformed JSON
* empty response
* interrupted stream

策略：

* 指数退避重试
* 最多 3 次
* 所有失败写入 trace/event log

---

# 13. Prompt 栈

Prompt 必须分层，不允许把所有东西拼成混乱大字符串。

## 13.1 Prompt 组成

```text
system_base
+ org_policy
+ project_rules
+ relevant_skills
+ workflow_hints
+ session_memory_summary
+ current_mode_prompt
+ current_step_prompt
+ context_bundle
+ tool_contracts
+ output_schema
```

## 13.2 模式 prompt

必须至少实现：

* `plan`
* `architect`
* `edit`
* `review`
* `test`
* `summarize`

## 13.3 Prompt 约束

* 计划阶段禁止建议直接修改文件
* 编辑阶段必须限定可编辑范围
* reviewer 不允许直接修改文件，只能提意见
* tester 只关注验证与失败诊断
* architect 不输出最终代码全文，输出设计与修改策略

---

# 14. 工具系统

---

## 14.1 工具分类

分为三类：

1. `builtin`：本地工具
2. `mcp`：通过 MCP 接入
3. `remote`：外部服务工具

## 14.2 工具元信息

所有工具必须有：

* 名称
* 描述
* 输入 schema
* 输出 schema
* 权限策略
* 超时
* 是否幂等

## 14.3 ToolContext

```ts
export interface ToolContext {
  sessionId: string;
  workspaceRoot: string;
  repoRoot?: string;
  sandbox: Sandbox;
  approvals: ApprovalService;
  logger: Logger;
  storage: StorageFacade;
}
```

## 14.4 v1 必须实现的 builtin tools

### 文件类

* `file.read`
* `file.write`
* `file.append`
* `file.delete`
* `file.list`
* `file.stat`

### 搜索类

* `grep.search`
* `repo.tree`
* `repo.repo_map`
* `repo.symbol_lookup`

### patch 类

* `patch.apply`
* `patch.preview`
* `diff.unified`

### shell 类

* `shell.exec`

### git 类

* `git.status`
* `git.diff`
* `git.show`
* `git.branch_current`

### 验证类

* `test.run`
* `lint.run`
* `build.run`

### approval 类

* `approval.request`
* `approval.status`

## 14.5 工具返回要求

返回必须是 JSON 风格对象，不得只返回自然语言散文。

示例：

```ts
type FileReadResult = {
  path: string;
  content: string;
  truncated: boolean;
  startLine?: number;
  endLine?: number;
};
```

## 14.6 工具权限

默认权限：

* `file.read`: allow
* `file.list`: allow
* `grep.search`: allow
* `repo.tree`: allow
* `repo.repo_map`: allow
* `repo.symbol_lookup`: allow
* `file.write`: ask
* `file.delete`: ask
* `patch.apply`: ask
* `shell.exec`: ask
* `lint.run`: ask
* `test.run`: ask
* `build.run`: ask
* `remote.search`: ask

## 14.7 工具调用记录

每次工具调用必须记录：

* tool name
* args
* status
* start time
* end time
* stdout/stderr 路径（如有）
* result summary

---

# 15. MCP 支持

---

## 15.1 目标

实现 MCP client，用于接入外部工具能力。
v1 只做 client，不做 server 作为硬要求。

## 15.2 支持方式

必须支持：

* stdio transport
* HTTP transport（如果实现成本可控）

## 15.3 MCP 集成要求

* 将 MCP tool 映射为本地统一 Tool 接口
* 保留 tool schema
* 所有调用仍受 renews_agent approval policy 控制
* MCP 错误必须转换为统一 ToolError

---

# 16. Sandbox 设计

---

## 16.1 Provider 类型

必须定义：

```ts
export interface Sandbox {
  exec(req: ExecRequest): Promise<ExecResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  destroy?(): Promise<void>;
}
```

必须实现：

* `DockerSandbox`
* `ProcessSandbox`

## 16.2 默认 provider

默认必须是 `DockerSandbox`。

`ProcessSandbox` 仅用于：

* 本地快速开发
* 受控环境
* 测试

## 16.3 DockerSandbox 要求

* 挂载 workspace
* 可配置是否禁网
* 可配置可写目录
* 记录 stdout/stderr
* 支持命令超时
* 支持取消信号

## 16.4 命令执行要求

```ts
export interface ExecRequest {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  approvalAction?: ApprovalAction;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}
```

## 16.5 命令黑名单

必须有 deny list，至少包含明显危险命令模式：

* `rm -rf /`
* `shutdown`
* `reboot`
* `mkfs`
* `dd if=`
* 任意尝试访问宿主敏感目录的命令
* 任意覆盖 `.git` 内部关键文件的命令

---

# 17. Workspace 与 Patch 系统

---

## 17.1 文件操作原则

* 小修改优先使用 patch
* 大修改允许 whole-file rewrite
* 修改前必须尽量读取相关上下文
* 所有写操作必须可回滚

## 17.2 Patch 抽象

```ts
export interface PatchOperation {
  path: string;
  kind: "replace_range" | "replace_file" | "create_file" | "delete_file";
  startLine?: number;
  endLine?: number;
  oldText?: string;
  newText?: string;
}
```

## 17.3 Patch 应用策略

优先级：

1. 精准行范围替换
2. 语义块替换
3. whole-file rewrite
4. 人工介入

## 17.4 Patch 校验

应用 patch 前后必须检查：

* 文件是否存在
* oldText 是否匹配
* 结果是否语法可解析（可选，按语言）
* 是否影响受保护路径

---

# 18. 代码理解内核

这是系统的核心护城河，优先级高于多 agent。

---

## 18.1 目标

在大仓库中，必须在有限上下文内让模型获得高质量代码理解。

## 18.2 tree-sitter

必须用 tree-sitter 做增量解析，用于：

* 顶层符号提取
* import/export 提取
* 类/函数/方法定位
* 依赖关系识别
* 文件摘要生成

## 18.3 SymbolIndex

```ts
export interface SymbolEntry {
  id: string;
  filePath: string;
  language: string;
  kind: "class" | "function" | "method" | "interface" | "type" | "const" | "module";
  name: string;
  signature?: string;
  startLine: number;
  endLine: number;
  exported: boolean;
}
```

## 18.4 RepoMap

RepoMap 是整个仓库的压缩结构摘要，不是全文索引。

```ts
export interface RepoMap {
  generatedAt: string;
  files: RepoMapFile[];
}

export interface RepoMapFile {
  path: string;
  summary: string;
  symbols: Array<{
    name: string;
    kind: string;
    signature?: string;
    exported?: boolean;
  }>;
}
```

## 18.5 Hybrid Retrieval

默认不依赖向量库。
必须实现混合检索：

* 关键词/BM25
* 文件路径匹配
* symbol 命中
* import graph 扩展
* git diff 邻近性
* 最近编辑历史加权
* validation failure 相关加权

## 18.6 RetrievalHit

```ts
export interface RetrievalHit {
  filePath: string;
  reason: string;
  score: number;
  snippets: FileSnippet[];
}
```

## 18.7 Context Selection

构建上下文包时必须考虑：

* 当前任务描述
* 计划步骤目标
* 活动文件
* 最近编辑文件
* symbol 查询结果
* 检索命中
* repo map
* 最近失败日志摘要
* 规则与技能

## 18.8 增量更新

仓库文件变更后必须支持：

* 增量重新解析
* 局部 repo map 更新
* 索引缓存失效
* 文件摘要重新计算

---

# 19. Rules / Skills / Workflows / Memory

---

## 19.1 Rules

Rules 是长期约束，默认路径：

`.renews/rules/**/*.md`

规则用途：

* 编码规范
* 架构限制
* 测试要求
* 禁止修改区域
* 依赖策略
* 安全策略

规则文档必须有 frontmatter：

```md
---
name: backend_rules
priority: 80
appliesTo:
  - "packages/**"
---

- 禁止直接修改生成代码
- 新增 API 必须补单元测试
- 不允许引入新的全局状态
```

## 19.2 Skills

Skills 是可触发能力包，默认路径：

`.renews/skills/**/*.md`

示例：

* `write_migration`
* `refactor_typescript_api`
* `fix_failing_vitest`
* `add_rest_endpoint`

skill 必须有：

* 触发条件
* 使用建议
* 操作步骤
* 注意事项

## 19.3 Workflows

Workflows 是任务模板，默认路径：

`.renews/workflows/**/*.yaml`

示例：

```yaml
name: add_api_endpoint
match:
  any:
    - "新增接口"
    - "add api"
steps:
  - plan_endpoint_contract
  - inspect_router
  - add_handler
  - add_tests
  - run_validation
```

## 19.4 Memory

必须实现两类记忆：

* `session memory`
* `project memory`

### Session Memory

短期、与当前会话相关：

* 任务摘要
* 最近决策
* 最近失败原因
* 当前计划偏好

### Project Memory

长期、与项目相关：

* 常见命令
* 测试入口
* 构建约束
* 目录约定
* 历史决策摘要

## 19.5 Memory 压缩

会话变长后，必须定期做 summary/compaction：

* 保留关键决策
* 保留未完成事项
* 丢弃冗余聊天内容
* 保留文件修改摘要

---

# 20. Agent 角色定义

采用 **单 Supervisor + typed subagents** 架构。
禁止自由群聊式多 agent。

---

## 20.1 Supervisor

职责：

* 驱动状态机
* 决定下一步该由谁执行
* 控制审批
* 控制 checkpoint
* 汇总最终结果

不能直接做复杂编辑。

## 20.2 Planner

职责：

* 分析用户任务
* 探索仓库
* 读取 repo map / symbols / relevant files
* 生成结构化执行计划
* 输出风险和假设

限制：

* 不允许写文件
* 不允许执行破坏性命令

## 20.3 Architect

职责：

* 分析当前计划步骤
* 输出修改策略
* 确定需要编辑的文件、函数、模块
* 给 Editor 提供结构化编辑指令

限制：

* 不直接改文件

## 20.4 Editor

职责：

* 根据 Architect 结果生成 patch 或文件修改
* 尽量最小改动
* 处理 patch 冲突
* 输出修改摘要

## 20.5 Tester

职责：

* 运行 lint / test / build
* 解析失败原因
* 把失败压缩为修复上下文
* 决定是否进入 repair loop

## 20.6 Reviewer

职责：

* 审查修改质量
* 检查是否偏离目标
* 检查是否遗漏测试/文档/边界条件
* 提出修正建议

限制：

* 不直接改文件

## 20.7 Searcher

职责：

* 仅在需要联网时调用外部 SearchProvider
* 结构化返回搜索结果
* 不能做本地搜索引擎职责

---

# 21. Agent handoff 契约

所有 handoff 必须 typed。

## 21.1 Planner -> Supervisor

```ts
export interface PlannerOutput {
  summary: string;
  assumptions: string[];
  risks: string[];
  requiresApproval: boolean;
  steps: Array<{
    title: string;
    goal: string;
    editablePaths?: string[];
    validationTargets?: string[];
    toolIntents: string[];
  }>;
}
```

## 21.2 Architect -> Editor

```ts
export interface EditInstruction {
  stepId: string;
  targetFiles: string[];
  strategy: string;
  constraints: string[];
  expectedChanges: Array<{
    filePath: string;
    changeType: "modify" | "create" | "delete";
    targets?: string[];
  }>;
}
```

## 21.3 Tester -> Supervisor

```ts
export interface ValidationOutput {
  passed: boolean;
  commandResults: Array<{
    command: string;
    exitCode: number;
    stdoutSummary: string;
    stderrSummary: string;
  }>;
  failureSummary?: string;
  suggestedRepairTargets?: string[];
}
```

## 21.4 Reviewer -> Supervisor

```ts
export interface ReviewOutput {
  accepted: boolean;
  concerns: string[];
  requiredFixes: string[];
  suggestedFiles: string[];
}
```

---

# 22. 运行流程

---

## 22.1 总流程

```text
User Task
-> Session Created
-> Plan Mode
-> Approval
-> Act Mode
-> Architect
-> Editor
-> Checkpoint
-> Validate
-> Repair Loop (if needed)
-> Review
-> Final Summary
```

## 22.2 Plan Mode

Plan Mode 必须执行：

1. 加载配置
2. 扫描 repo root
3. 生成或读取 repo map
4. 检索相关文件
5. 读取关键上下文
6. 生成计划
7. 输出风险与假设
8. 如需，发起审批

限制：

* 不写文件
* 不运行危险命令
* 不安装依赖

## 22.3 Act Mode

Act Mode 必须执行：

1. 选择当前步骤
2. 读取步骤上下文
3. Architect 输出策略
4. Editor 实施修改
5. 创建 checkpoint
6. 记录 diff
7. 运行验证
8. 失败则修复

## 22.4 Repair Loop

repair loop 上限默认 3 次。

每次循环：

1. 收集失败日志
2. 压缩失败上下文
3. 定位相关文件
4. 再次走 Architect -> Editor
5. 重新验证

超限后：

* 标记 `failed`
* 输出失败原因和手工建议

## 22.5 Review

review 阶段检查：

* 是否满足原始任务
* 是否有未覆盖测试
* 是否引入明显代码坏味道
* 是否偏离风格规则
* 是否需要额外文档变更

---

# 23. Approval 系统

---

## 23.1 原则

任何具有副作用的动作都必须经过统一审批系统。

## 23.2 审批动作

必须支持：

* 写文件
* 删除文件
* 执行 shell 命令
* 安装依赖
* 使用远程搜索
* git commit（若后续支持）
* 网络请求

## 23.3 风险分级

* `low`
* `medium`
* `high`

### 示例

* 读文件：无审批
* 写测试文件：low
* 修改核心业务文件：medium
* 删除目录：high
* 安装依赖：high
* 开放网络访问：high

## 23.4 审批缓存策略

支持：

* `ask every time`
* `approve once`
* `approve per tool per session`

## 23.5 CLI 审批交互

CLI 必须展示：

* 动作类型
* 风险级别
* 目标路径/命令
* 原因说明
* 选项：approve / reject / approve once

---

# 24. Checkpoint 与 Resume

---

## 24.1 目标

不使用 shadow git 仓库做 checkpoint。
采用**内容寻址快照**。

## 24.2 Checkpoint 内容

checkpoint manifest 必须包含：

* 文件路径
* 文件 hash
* 文件 blob 引用
* 创建时间
* 所属 session
* 父 checkpoint

## 24.3 Snapshot Store

建议目录：

`.renews/checkpoints/`

布局：

```text
.renews/checkpoints/
  blobs/
    ab/cdef...
  manifests/
    checkpoint-id.json
```

## 24.4 创建 checkpoint 的时机

必须在以下时机创建：

* 进入 Act 前
* 每次 Editor 批量修改后
* repair loop 前
* review 前
* 用户显式要求时

## 24.5 Resume

恢复时必须：

1. 加载最近 session 状态
2. 恢复当前 plan step
3. 恢复当前 checkpoint
4. 恢复待审批项
5. 恢复最近事件摘要

---

# 25. 搜索系统

---

## 25.1 约束

搜索不在本地实现，只通过外部 `SearchProvider`。

## 25.2 抽象接口

```ts
export interface SearchQuery {
  query: string;
  maxResults?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface SearchProvider {
  search(query: SearchQuery): Promise<SearchResultItem[]>;
}
```

## 25.3 使用规则

* 默认不触发搜索
* 仅在任务明确需要外部信息时触发
* 必须走 approval
* 搜索结果必须保留来源信息
* 搜索结果不得进入本地 symbol index

---

# 26. CLI 设计

---

## 26.1 命令列表

必须实现：

```bash
renews task "<goal>"
renews plan "<goal>"
renews resume <sessionId>
renews approvals
renews status <sessionId>
renews logs <sessionId>
renews checkpoint list <sessionId>
renews checkpoint restore <sessionId> <checkpointId>
renews config validate
renews index rebuild
```

## 26.2 交互式任务模式

`renews task "..."` 行为：

1. 创建 session
2. 进入 plan
3. 输出结构化计划
4. 请求审批
5. 执行
6. 输出结果摘要和 diff 摘要

## 26.3 非交互模式

支持：

```bash
renews task "fix failing tests" --headless --json
```

输出 JSON event stream，供外部系统消费。

---

# 27. Headless Service 设计

---

## 27.1 目的

为 IDE adapter 或上层平台提供 API。

## 27.2 必须提供的接口

* `POST /sessions`
* `POST /sessions/:id/plan`
* `POST /sessions/:id/execute`
* `GET /sessions/:id`
* `GET /sessions/:id/events`
* `POST /approvals/:id/approve`
* `POST /approvals/:id/reject`
* `POST /sessions/:id/resume`
* `POST /sessions/:id/cancel`

## 27.3 事件流

支持 SSE 或 websocket 任选其一。
v1 选 SSE 更简单。

---

# 28. IDE Adapter 设计

---

## 28.1 目标

让 IDE 中能看到：

* plan
* steps
* approvals
* diff summary
* validation logs
* checkpoints

## 28.2 v1 范围

v1 只做轻量 adapter，不做复杂原生 IDE 智能分析。
尽量复用 service API。

---

# 29. 日志、追踪与审计

---

## 29.1 日志要求

必须区分：

* user-facing logs
* debug logs
* audit logs

## 29.2 必须记录的信息

* session lifecycle
* model calls
* tool calls
* approvals
* patch summary
* validation runs
* failures
* checkpoints
* resume events

## 29.3 敏感信息保护

* API key 不进日志
* 环境变量不整量打印
* 文件内容打印需截断
* 搜索结果可记录 URL，但避免泄露敏感私有地址

---

# 30. 安全策略

---

## 30.1 默认 deny

以下必须默认拒绝或需高风险审批：

* 破坏性 shell
* 任意网络访问
* 修改敏感系统目录
* 修改 `.git` 内部对象
* 读取用户私钥路径
* 将代码上传到未知远端

## 30.2 路径保护

默认保护：

* `.git/**`
* `node_modules/**`
* `.env`
* `*.pem`
* `*.key`
* OS 敏感目录

可配置白名单。

## 30.3 安全输出

工具错误信息要清晰，但不泄露机密。

---

# 31. 测试策略

---

## 31.1 测试层次

必须实现：

1. unit tests
2. integration tests
3. sandbox tests
4. retrieval quality tests
5. end-to-end repo tests
6. crash recovery tests

## 31.2 单元测试范围

* config parsing
* state machine transitions
* approval logic
* checkpoint manifest
* patch apply
* symbol extraction
* retrieval ranking
* model response parser

## 31.3 集成测试范围

* CLI -> session -> plan
* act -> edit -> validate
* approval -> resume
* Docker sandbox exec
* SQLite persistence

## 31.4 E2E 仓库测试

准备若干示例仓库：

* TypeScript web app
* Node backend
* Python package
* Monorepo sample

任务集示例：

* 修复 failing test
* 新增 API endpoint
* 重命名函数并修复引用
* 更新类型定义
* 增加单元测试
* 修复构建报错

---

# 32. 评测系统

---

## 32.1 指标

必须至少统计：

* plan success rate
* edit success rate
* validation pass rate
* repair loop success rate
* avg tool calls
* avg token usage
* avg latency
* checkpoint recovery success rate

## 32.2 回归机制

任何核心模块修改后，必须能自动回归：

* retrieval benchmark
* patch benchmark
* validation benchmark
* checkpoint/resume benchmark

---

# 33. Phase Roadmap

---

## Phase 0：基础设施

实现：

* monorepo
* TypeScript strict
* config loader
* logger
* SQLite migrations
* event bus
* basic CLI

验收：

* `renews task "hello"` 能创建 session 并记录事件

---

## Phase 1：模型网关

实现：

* ModelClient 抽象
* OpenAI-compatible provider
* streaming
* structured parser
* retry/timeout

验收：

* 可通过第三方 API 网关请求模型并拿到结构化结果

---

## Phase 2：工具层 + 沙箱

实现：

* file tools
* shell tool
* patch tool
* git read tools
* Docker sandbox
* Process sandbox
* approval middleware

验收：

* 在 Docker 内执行命令
* 文件修改可审批

---

## Phase 3：代码理解

实现：

* tree-sitter 集成
* symbol index
* repo map
* hybrid retrieval
* incremental update

验收：

* 给定任务可返回 top-k 相关文件与 repo map

---

## Phase 4：Plan 模式

实现：

* planner agent
* read-only exploration
* structured plan output
* approval before act

验收：

* 能稳定生成计划，且计划阶段无写操作

---

## Phase 5：Act + Architect/Editor

实现：

* architect agent
* editor agent
* patch application
* change summary

验收：

* 能完成多文件修改并产生可读 diff 摘要

---

## Phase 6：验证闭环

实现：

* lint/test/build runner
* log summarizer
* repair loop

验收：

* 修改后自动验证，失败能进入修复循环

---

## Phase 7：Rules / Skills / Workflows / Memory

实现：

* rules loader
* skills loader
* workflows loader
* session/project memory
* compaction

验收：

* 项目规则可影响计划与执行

---

## Phase 8：Typed Subagents

实现：

* supervisor orchestration
* typed handoff
* reviewer
* tester
* searcher

验收：

* 多角色可协作，但无自由群聊

---

## Phase 9：Checkpoint / Resume

实现：

* content-addressed snapshot store
* interrupt/resume
* restore checkpoint

验收：

* 杀掉进程后仍可恢复任务

---

## Phase 10：Search Provider

实现：

* SearchProvider 抽象
* remote search tool
* approval integration

验收：

* 需要联网时可调用远程搜索 API

---

## Phase 11：Service + IDE Adapter

实现：

* REST/SSE
* lightweight IDE adapter

验收：

* IDE 可看到 plan / approvals / logs

---

## Phase 12：硬化与评测

实现：

* benchmark harness
* regression suite
* security tests

验收：

* 能在样例仓库上稳定回归

---

# 34. Codex 实施顺序

以下顺序必须遵循，避免一开始写太多不可运行代码。

## Step 1

创建：

* monorepo
* tsconfig
* package.json
* pnpm workspace
* 基础脚本

## Step 2

创建共享 schema 与核心类型：

* `packages/shared/src/schema`
* `packages/core/src/types`

## Step 3

创建 storage：

* migrations
* SQLite adapter
* repositories

## Step 4

创建 core runtime：

* state machine
* event bus
* session manager

## Step 5

创建 config：

* loader
* env resolve
* validation

## Step 6

创建 model 层：

* ModelClient
* OpenAICompatible provider
* parser
* streaming

## Step 7

创建 sandbox：

* process
* docker

## Step 8

创建 builtin tools：

* file
* shell
* patch
* grep
* git

## Step 9

创建 context：

* tree-sitter
* symbol index
* repo map
* retrieval

## Step 10

创建 agents：

* planner
* architect
* editor
* tester
* reviewer
* supervisor

## Step 11

创建 approval/checkpoint/memory

## Step 12

创建 CLI

## Step 13

创建 service

## Step 14

创建 IDE adapter

## Step 15

补测试、E2E、评测

---

# 35. 每个包的最低交付要求

---

## 35.1 `packages/core`

必须提供：

* `Runtime`
* `Scheduler`
* `StateMachine`
* `ApprovalService`
* `CheckpointService`
* `EventBus`

## 35.2 `packages/model`

必须提供：

* `ModelClient`
* `OpenAICompatibleModelClient`
* `StructuredOutputParser`
* `PromptBuilder`

## 35.3 `packages/sandbox`

必须提供：

* `Sandbox`
* `ProcessSandbox`
* `DockerSandbox`

## 35.4 `packages/workspace`

必须提供：

* file ops
* patch ops
* git read ops
* diff formatter

## 35.5 `packages/context`

必须提供：

* `TreeSitterManager`
* `SymbolIndexer`
* `RepoMapBuilder`
* `HybridRetriever`

## 35.6 `packages/tools`

必须提供统一 Tool 注册与调用机制。

## 35.7 `packages/agents`

必须提供：

* `SupervisorAgent`
* `PlannerAgent`
* `ArchitectAgent`
* `EditorAgent`
* `TesterAgent`
* `ReviewerAgent`
* `SearcherAgent`

## 35.8 `packages/memory`

必须提供：

* `SessionMemoryStore`
* `ProjectMemoryStore`
* `MemorySummarizer`

---

# 36. 错误模型

必须定义统一错误类型：

```ts
export class RenewsError extends Error {
  code: string;
  retryable: boolean;
  details?: unknown;
}

export class ApprovalRequiredError extends RenewsError {}
export class ToolExecutionError extends RenewsError {}
export class ModelInvocationError extends RenewsError {}
export class PatchApplyError extends RenewsError {}
export class ValidationError extends RenewsError {}
export class CheckpointError extends RenewsError {}
```

所有错误必须：

* 可追踪
* 可归类
* 可决定是否重试

---

# 37. 输出规范

---

## 37.1 Plan 输出

必须包括：

* 任务摘要
* 风险
* 假设
* 步骤列表
* 每步可能修改的文件
* 验证方式

## 37.2 执行输出

必须包括：

* 本步做了什么
* 修改了哪些文件
* 为什么这么改
* 是否需要用户确认

## 37.3 最终输出

必须包括：

* 完成状态
* 关键修改摘要
* 验证结果
* 未解决问题
* 建议后续动作

---

# 38. 样例：典型任务流程

任务：

> 修复 monorepo 中 packages/api 的 failing tests，并补齐缺失的类型声明

系统行为：

1. 创建 session
2. Planner 读取 repo map、测试配置、packages/api 下关键文件
3. 产出计划：

   * 定位 failing tests
   * 定位类型错误来源
   * 修改实现
   * 补测试
   * 运行验证
4. 审批运行测试
5. Tester 跑 `pnpm --filter api test`
6. 提取失败堆栈
7. Architect 给出修改策略
8. Editor 修改代码和类型
9. 创建 checkpoint
10. Tester 重新运行测试
11. Reviewer 检查是否遗漏类型和边界情况
12. 输出最终摘要

---

# 39. 禁止项

实现时明确禁止：

1. 不得把整个仓库全文无差别塞进 prompt
2. 不得让子代理自由互聊
3. 不得默认 process sandbox
4. 不得把 embeddings / vector DB 做成硬依赖
5. 不得使用 shadow git 仓库作为 checkpoint 主实现
6. 不得把审批逻辑散落在工具内部，必须统一入口
7. 不得把规则、技能、工作流、记忆混成一段 prompt 文本
8. 不得依赖外部云服务才能运行核心本地能力
9. 不得在无审批情况下执行高风险命令
10. 不得把敏感环境变量写入日志

---

# 40. Definition of Done

当以下条件成立时，v1 视为完成：

## 40.1 功能完成

* 可通过第三方 API 网关调用模型
* 可在本地仓库上运行
* 默认 Docker 沙箱
* 支持 plan/act
* 支持 architect/editor
* 支持 repo map + tree-sitter + hybrid retrieval
* 支持 approval
* 支持 lint/test/build 验证闭环
* 支持 checkpoint/resume
* 支持 CLI
* 支持 headless service
* 支持外部搜索 provider
* 支持 rules/skills/workflows/memory

## 40.2 工程完成

* 全量类型检查通过
* 核心包有单元测试
* 至少 3 个 E2E 样例仓库通过
* 恢复测试通过
* 评测脚手架可运行
* 文档完整

## 40.3 质量标准

* 主要功能有结构化日志
* 错误信息可读
* 配置校验健全
* 默认行为安全
* 在中型仓库中不会因上下文暴涨而立即失控

---

# 41. 建议的首批实现文件清单

以下是 Codex 首批应创建的关键文件：

```text
packages/shared/src/schema/common.ts
packages/shared/src/schema/tool.ts
packages/shared/src/schema/plan.ts

packages/core/src/types/session.ts
packages/core/src/types/plan.ts
packages/core/src/types/event.ts
packages/core/src/types/checkpoint.ts
packages/core/src/runtime/runtime.ts
packages/core/src/runtime/state-machine.ts
packages/core/src/approvals/approval-service.ts
packages/core/src/checkpoints/checkpoint-service.ts

packages/storage/src/sqlite/client.ts
packages/storage/src/migrations/0001_init.sql
packages/storage/src/repositories/session-repo.ts
packages/storage/src/repositories/event-repo.ts

packages/config/src/load-config.ts
packages/config/src/schema.ts

packages/model/src/client/model-client.ts
packages/model/src/providers/openai-compatible.ts
packages/model/src/parser/structured-output.ts
packages/model/src/prompt/prompt-builder.ts

packages/sandbox/src/base/types.ts
packages/sandbox/src/process/process-sandbox.ts
packages/sandbox/src/docker/docker-sandbox.ts

packages/tools/src/registry.ts
packages/tools/src/builtin/file/read.ts
packages/tools/src/builtin/file/write.ts
packages/tools/src/builtin/shell/exec.ts
packages/tools/src/builtin/patch/apply.ts

packages/context/src/treesitter/manager.ts
packages/context/src/index/symbol-indexer.ts
packages/context/src/repomap/build-repo-map.ts
packages/context/src/retrieval/hybrid-retriever.ts

packages/agents/src/planner/planner-agent.ts
packages/agents/src/architect/architect-agent.ts
packages/agents/src/editor/editor-agent.ts
packages/agents/src/tester/tester-agent.ts
packages/agents/src/reviewer/reviewer-agent.ts
packages/agents/src/supervisor/supervisor-agent.ts

apps/cli/src/main.ts
apps/cli/src/commands/task.ts
apps/cli/src/commands/resume.ts
```

---

# 42. Codex 执行规则

给 Codex 的约束如下：

1. 严格按 phase 顺序实现
2. 每 phase 完成后先补测试再进下一 phase
3. 先实现抽象接口，再实现 provider
4. 先跑通 CLI 最小闭环，再扩充能力
5. 每新增工具都必须写 schema、测试、日志
6. 所有 agent 输出都必须结构化
7. 对高风险能力默认保守
8. 所有模块必须可独立单测
9. 所有长文本 prompt 必须模板化
10. 不允许在未实现 approval 的前提下落地写操作

---

# 43. 最小可运行闭环

最小闭环定义如下：

输入：

```bash
renews task "修复 packages/core 中一个 failing test"
```

系统应能：

1. 创建 session
2. 建立 plan
3. 请求审批运行测试
4. 执行测试
5. 读取失败日志
6. 读取相关文件
7. 产出修改方案
8. 修改文件
9. 再次运行测试
10. 输出完成结果

只要这个闭环能稳定完成，就说明系统主骨架成立。

---

# 44. v1.1 以后可扩展项

以下不在 v1 强制范围内，但需预留扩展点：

* 多工作区
* 远程沙箱
* git commit / branch / PR integration
* richer IDE UX
* optional embeddings retrieval
* browser automation
* organization policy server
* shared team memory
* plugin marketplace

---

# 45. 最终一句实现指令

**请按照本文档实现一个 TypeScript（Node.js 22+）编写的本地优先 coding agent framework：`renews_agent`。除联网搜索外，所有核心能力在本地实现。必须提供可运行的 CLI、可恢复的状态机、默认 Docker 沙箱、repo map/tree-sitter 上下文引擎、Plan/Act 工作流、Architect/Editor 双阶段编辑、审批系统、验证闭环、checkpoint/resume、统一工具系统、MCP client、SQLite 持久化，以及完整测试。**

---

如果你要，我下一条可以继续把这份规格书再细化成：

**1）逐文件 TODO 清单**
或者
**2）直接给 Codex 的 `TASKS.md` + `PHASE_0.md ~ PHASE_12.md`**
