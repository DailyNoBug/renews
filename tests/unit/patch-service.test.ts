import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PatchService, WorkspaceFs } from "@renews/workspace/index";

describe("PatchService", () => {
  it("applies replace_range operations", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renews-patch-"));
    await fs.writeFile(path.join(root, "sample.ts"), "line1\nline2\nline3\n", "utf8");
    const service = new PatchService(new WorkspaceFs(root));
    await service.apply([
      {
        path: "sample.ts",
        kind: "replace_range",
        startLine: 2,
        endLine: 2,
        newText: "updated",
      },
    ]);

    const content = await fs.readFile(path.join(root, "sample.ts"), "utf8");
    expect(content).toContain("updated");
  });
});
