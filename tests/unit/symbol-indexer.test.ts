import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SymbolIndexer, TreeSitterManager } from "@renews/context/index";

describe("SymbolIndexer", () => {
  it("extracts exported symbols from TypeScript", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renews-symbol-"));
    const file = path.join(root, "sample.ts");
    await fs.writeFile(file, "export function greet() {}\nexport const value = 1;\n", "utf8");
    const indexer = new SymbolIndexer(new TreeSitterManager());
    const symbols = await indexer.indexFile(file);
    expect(symbols.map((symbol) => symbol.name)).toContain("greet");
    expect(symbols.map((symbol) => symbol.name)).toContain("value");
  });
});
