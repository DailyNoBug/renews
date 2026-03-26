import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HybridRetriever, SymbolIndexer, TreeSitterManager } from "@renews/context/index";

describe("HybridRetriever", () => {
  it("returns top-k relevant files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renews-retrieval-"));
    await fs.writeFile(path.join(root, "auth.ts"), "export const login = () => true;\n", "utf8");
    await fs.writeFile(path.join(root, "user.ts"), "export const userName = 'demo';\n", "utf8");
    const retriever = new HybridRetriever(root, new SymbolIndexer(new TreeSitterManager()));
    const hits = await retriever.retrieve({
      task: "fix login flow",
      workspaceRoot: root,
      topK: 2,
    });
    expect(hits[0]?.filePath).toBe("auth.ts");
  });
});
