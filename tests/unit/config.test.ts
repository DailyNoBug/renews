import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "@renews/config/index";

describe("loadConfig", () => {
  it("loads project config and resolves env placeholders", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renews-config-"));
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
    model: exec
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
`,
      "utf8",
    );

    const result = loadConfig({
      cwd: root,
      env: {
        MODEL_GATEWAY_URL: "https://gateway.example.com",
        MODEL_GATEWAY_KEY: "secret",
        SEARCH_API_URL: "https://search.example.com",
        SEARCH_API_KEY: "search-secret",
      },
    });

    expect(result.config.project.name).toBe("demo");
    expect(result.config.models.planner.baseURL).toBe("https://gateway.example.com");
    expect(result.warnings).toEqual([]);
  });
});
