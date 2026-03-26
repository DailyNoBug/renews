import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bootstrapSupervisorSystem } from "@renews/core/index";

const writeConfig = async (root: string): Promise<void> => {
  await fs.mkdir(path.join(root, ".renews", "rules"), { recursive: true });
  await fs.mkdir(path.join(root, ".renews", "skills"), { recursive: true });
  await fs.mkdir(path.join(root, ".renews", "workflows"), { recursive: true });
  await fs.writeFile(path.join(root, "index.ts"), "export const value = 1;\n", "utf8");
  await fs.writeFile(
    path.join(root, "renews.config.yaml"),
    `
project:
  name: demo
  workspaceRoot: .
  defaultMode: plan
models:
  planner:
    provider: openai_compatible
    baseURL: \${MODEL_GATEWAY_URL}
    apiKeyEnv: MODEL_GATEWAY_KEY
    model: planner
  executor:
    provider: openai_compatible
    baseURL: \${MODEL_GATEWAY_URL}
    apiKeyEnv: MODEL_GATEWAY_KEY
    model: executor
  editor:
    provider: openai_compatible
    baseURL: \${MODEL_GATEWAY_URL}
    apiKeyEnv: MODEL_GATEWAY_KEY
    model: editor
  reviewer:
    provider: openai_compatible
    baseURL: \${MODEL_GATEWAY_URL}
    apiKeyEnv: MODEL_GATEWAY_KEY
    model: reviewer
sandbox:
  provider: process
  image: demo
  network: restricted
  writablePaths: ["."]
  blockedCommands: []
approvals:
  default: auto_approve
  allowReadOnlyToolsWithoutApproval: true
  requireApprovalFor: []
context:
  repoMap:
    enabled: true
    maxSymbols: 100
  retrieval:
    strategy: hybrid
    useEmbeddings: false
    topK: 5
  treeSitter:
    enabled: true
search:
  provider: remote
  apiBaseURL: \${SEARCH_API_URL}
  apiKeyEnv: SEARCH_API_KEY
  maxResults: 8
rules:
  paths: [".renews/rules"]
skills:
  paths: [".renews/skills"]
workflows:
  paths: [".renews/workflows"]
storage:
  dbPath: ".renews/storage/renews.db"
`,
    "utf8",
  );
};

describe("runtime plan integration", () => {
  it("creates a session and plan", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renews-plan-"));
    await writeConfig(root);
    const previous = process.cwd();
    process.chdir(root);
    process.env.MODEL_GATEWAY_URL = "https://gateway.example.com";
    process.env.SEARCH_API_URL = "https://search.example.com";
    try {
      const system = bootstrapSupervisorSystem({
        workspaceRoot: root,
      });
      const session = system.runtime.createSession("inspect index.ts");
      const plan = await system.supervisor.plan(session.id);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(system.runtime.sessions.get(session.id)?.currentPlanId).toBe(plan.id);
    } finally {
      process.chdir(previous);
    }
  });
});
