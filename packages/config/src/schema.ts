import { z } from "zod";

const ModelRoleConfigSchema = z
  .object({
    provider: z.string().default("openai_compatible"),
    baseURL: z.string().min(1),
    apiKeyEnv: z.string().min(1),
    model: z.string().min(1),
    maxOutputTokens: z.number().int().positive().default(4096),
    temperature: z.number().min(0).max(2).default(0.1),
  })
  .strict();

const ContextConfigSchema = z
  .object({
    repoMap: z
      .object({
        enabled: z.boolean().default(true),
        maxSymbols: z.number().int().positive().default(1200),
      })
      .strict(),
    retrieval: z
      .object({
        strategy: z.enum(["hybrid"]).default("hybrid"),
        useEmbeddings: z.boolean().default(false),
        topK: z.number().int().positive().default(20),
      })
      .strict(),
    treeSitter: z
      .object({
        enabled: z.boolean().default(true),
      })
      .strict(),
  })
  .strict();

export const RenewsConfigSchema = z
  .object({
    project: z
      .object({
        name: z.string().default("renews_agent"),
        workspaceRoot: z.string().default("."),
        defaultMode: z.enum(["plan", "act"]).default("plan"),
      })
      .strict(),
    models: z
      .object({
        planner: ModelRoleConfigSchema,
        executor: ModelRoleConfigSchema,
        editor: ModelRoleConfigSchema,
        reviewer: ModelRoleConfigSchema,
        tester: ModelRoleConfigSchema.optional(),
        summarizer: ModelRoleConfigSchema.optional(),
        fast: ModelRoleConfigSchema.optional(),
      })
      .strict(),
    sandbox: z
      .object({
        provider: z.enum(["docker", "process"]).default("docker"),
        image: z.string().default("renews-agent:base"),
        network: z.enum(["restricted", "enabled"]).default("restricted"),
        writablePaths: z.array(z.string()).default(["."]),
        blockedCommands: z.array(z.string()).default([]),
      })
      .strict(),
    approvals: z
      .object({
        default: z.enum(["ask", "auto_approve", "deny"]).default("ask"),
        allowReadOnlyToolsWithoutApproval: z.boolean().default(true),
        requireApprovalFor: z.array(z.string()).default([]),
      })
      .strict(),
    context: ContextConfigSchema,
    search: z
      .object({
        provider: z.enum(["remote"]).default("remote"),
        apiBaseURL: z.string().min(1),
        apiKeyEnv: z.string().min(1),
        maxResults: z.number().int().positive().default(8),
      })
      .strict(),
    rules: z.object({ paths: z.array(z.string()).default([".renews/rules"]) }).strict(),
    skills: z.object({ paths: z.array(z.string()).default([".renews/skills"]) }).strict(),
    workflows: z.object({ paths: z.array(z.string()).default([".renews/workflows"]) }).strict(),
    storage: z
      .object({
        dbPath: z.string().default(".renews/storage/renews.db"),
      })
      .strict()
      .default({ dbPath: ".renews/storage/renews.db" }),
    service: z
      .object({
        host: z.string().default("127.0.0.1"),
        port: z.number().int().positive().default(8787),
      })
      .strict()
      .default({ host: "127.0.0.1", port: 8787 }),
  })
  .strict();

export type RenewsConfig = z.infer<typeof RenewsConfigSchema>;

export const defaultConfig: RenewsConfig = RenewsConfigSchema.parse({
  project: {
    name: "renews_agent",
    workspaceRoot: ".",
    defaultMode: "plan",
  },
  models: {
    planner: {
      provider: "openai_compatible",
      baseURL: "${MODEL_GATEWAY_URL}",
      apiKeyEnv: "MODEL_GATEWAY_KEY",
      model: "planner-large",
      maxOutputTokens: 8192,
      temperature: 0.2,
    },
    executor: {
      provider: "openai_compatible",
      baseURL: "${MODEL_GATEWAY_URL}",
      apiKeyEnv: "MODEL_GATEWAY_KEY",
      model: "coder-main",
      maxOutputTokens: 8192,
      temperature: 0.1,
    },
    editor: {
      provider: "openai_compatible",
      baseURL: "${MODEL_GATEWAY_URL}",
      apiKeyEnv: "MODEL_GATEWAY_KEY",
      model: "coder-fast",
      maxOutputTokens: 8192,
      temperature: 0,
    },
    reviewer: {
      provider: "openai_compatible",
      baseURL: "${MODEL_GATEWAY_URL}",
      apiKeyEnv: "MODEL_GATEWAY_KEY",
      model: "reviewer-main",
      maxOutputTokens: 4096,
      temperature: 0.1,
    },
  },
  sandbox: {
    provider: "docker",
    image: "renews-agent:base",
    network: "restricted",
    writablePaths: ["."],
    blockedCommands: [],
  },
  approvals: {
    default: "ask",
    allowReadOnlyToolsWithoutApproval: true,
    requireApprovalFor: [
      "write_file",
      "delete_file",
      "run_command",
      "install_dependency",
      "git_commit",
      "network_request",
      "use_remote_search",
    ],
  },
  context: {
    repoMap: {
      enabled: true,
      maxSymbols: 1200,
    },
    retrieval: {
      strategy: "hybrid",
      useEmbeddings: false,
      topK: 20,
    },
    treeSitter: {
      enabled: true,
    },
  },
  search: {
    provider: "remote",
    apiBaseURL: "${SEARCH_API_URL}",
    apiKeyEnv: "SEARCH_API_KEY",
    maxResults: 8,
  },
  rules: { paths: [".renews/rules"] },
  skills: { paths: [".renews/skills"] },
  workflows: { paths: [".renews/workflows"] },
  storage: { dbPath: ".renews/storage/renews.db" },
  service: { host: "127.0.0.1", port: 8787 },
});
