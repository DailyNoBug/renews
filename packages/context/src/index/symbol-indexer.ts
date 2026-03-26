import fs from "node:fs/promises";
import { createId } from "@renews/shared/index";
import { TreeSitterManager } from "../treesitter/manager.js";

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

interface FileCacheEntry {
  mtimeMs: number;
  symbols: SymbolEntry[];
}

export class SymbolIndexer {
  private readonly cache = new Map<string, FileCacheEntry>();

  constructor(private readonly treeSitter: TreeSitterManager) {}

  async indexFile(filePath: string): Promise<SymbolEntry[]> {
    const stat = await fs.stat(filePath);
    const cached = this.cache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.symbols;
    }

    const content = await fs.readFile(filePath, "utf8");
    const parsed = cached
      ? this.treeSitter.updateFile(filePath, content)
      : this.treeSitter.parseFile(filePath, content);
    const symbols = parsed.symbols.map<SymbolEntry>((symbol) => ({
      id: createId("symbol"),
      filePath,
      language: parsed.language,
      kind: symbol.kind,
      name: symbol.name,
      signature: symbol.signature,
      startLine: symbol.startLine,
      endLine: symbol.endLine,
      exported: symbol.exported,
    }));

    this.cache.set(filePath, {
      mtimeMs: stat.mtimeMs,
      symbols,
    });
    return symbols;
  }

  async lookupByName(filePaths: string[], query: string): Promise<SymbolEntry[]> {
    const results = await Promise.all(filePaths.map((filePath) => this.indexFile(filePath)));
    return results
      .flat()
      .filter((entry) => entry.name.toLowerCase().includes(query.toLowerCase()));
  }

  invalidate(filePath: string): void {
    this.treeSitter.invalidate(filePath);
    this.cache.delete(filePath);
  }
}
