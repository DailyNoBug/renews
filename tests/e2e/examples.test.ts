import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RepoMapBuilder, TreeSitterManager } from "@renews/context/index";

describe("example repositories", () => {
  it("builds repo maps for bundled example repositories", async () => {
    const examplesRoot = path.resolve("examples");
    const entries = await fs.readdir(examplesRoot);
    const builder = new RepoMapBuilder(new TreeSitterManager());
    for (const entry of entries) {
      const repoMap = await builder.build(path.join(examplesRoot, entry), 100);
      expect(repoMap.files.length).toBeGreaterThan(0);
    }
  });
});
