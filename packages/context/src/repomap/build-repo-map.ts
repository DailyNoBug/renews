import fs from "node:fs/promises";
import path from "node:path";
import { nowIso } from "@renews/shared/index";
import type { RepoMap } from "@renews/core/index";
import { TreeSitterManager } from "../treesitter/manager.js";

const supportedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".md"]);

const walkFiles = async (root: string): Promise<string[]> => {
  const files: string[] = [];

  const visit = async (currentPath: string): Promise<void> => {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (supportedExtensions.has(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  };

  await visit(root);
  return files;
};

export class RepoMapBuilder {
  constructor(private readonly treeSitter: TreeSitterManager) {}

  async build(workspaceRoot: string, maxSymbols = 1200): Promise<RepoMap> {
    const files = await walkFiles(workspaceRoot);
    let symbolCount = 0;
    const repoFiles: RepoMap["files"] = [];

    for (const filePath of files) {
      if (symbolCount >= maxSymbols) {
        break;
      }
      const content = await fs.readFile(filePath, "utf8");
      const parsed = this.treeSitter.parseFile(filePath, content);
      symbolCount += parsed.symbols.length;
      repoFiles.push({
        path: path.relative(workspaceRoot, filePath),
        summary: parsed.summary,
        symbols: parsed.symbols.map((symbol) => ({
          name: symbol.name,
          kind: symbol.kind,
          signature: symbol.signature,
          exported: symbol.exported,
        })),
      });
    }

    return {
      generatedAt: nowIso(),
      files: repoFiles,
    };
  }
}
