import fs from "node:fs/promises";
import path from "node:path";
import type { FileSnippet, RetrievalHit } from "@renews/core/index";
import { WorkspaceFs } from "@renews/workspace/index";
import { SymbolIndexer } from "../index/symbol-indexer.js";

export interface RetrievalQuery {
  task: string;
  workspaceRoot: string;
  topK: number;
  activeFiles?: string[];
  recentFiles?: string[];
  validationFailureSummary?: string;
}

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-zA-Z0-9_]+/)
    .filter(Boolean);

const scoreContent = (content: string, tokens: string[]): number =>
  tokens.reduce((total, token) => total + (content.toLowerCase().includes(token) ? 5 : 0), 0);

const scorePath = (filePath: string, tokens: string[]): number =>
  tokens.reduce((total, token) => total + (filePath.toLowerCase().includes(token) ? 7 : 0), 0);

export class HybridRetriever {
  private readonly fsService: WorkspaceFs;

  constructor(
    workspaceRoot: string,
    private readonly symbolIndexer: SymbolIndexer,
  ) {
    this.fsService = new WorkspaceFs(workspaceRoot);
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalHit[]> {
    const files = await this.fsService.list(".");
    const tokens = tokenize([query.task, query.validationFailureSummary].filter(Boolean).join(" "));
    const scored: RetrievalHit[] = [];

    for (const relativePath of files) {
      const absolutePath = path.join(query.workspaceRoot, relativePath);
      const stat = await fs.stat(absolutePath);
      if (stat.isDirectory()) {
        continue;
      }
      const content = await fs.readFile(absolutePath, "utf8");
      const symbols = await this.symbolIndexer.indexFile(absolutePath).catch(() => []);
      let score = scoreContent(content, tokens) + scorePath(relativePath, tokens);
      if (query.activeFiles?.includes(relativePath)) {
        score += 12;
      }
      if (query.recentFiles?.includes(relativePath)) {
        score += 10;
      }
      for (const symbol of symbols) {
        if (tokens.some((token) => symbol.name.toLowerCase().includes(token))) {
          score += 8;
        }
      }
      if (score <= 0) {
        continue;
      }

      const snippets: FileSnippet[] = [
        {
          path: relativePath,
          content: content.split(/\r?\n/).slice(0, 40).join("\n"),
          startLine: 1,
          endLine: Math.min(40, content.split(/\r?\n/).length),
          score,
        },
      ];
      scored.push({
        filePath: relativePath,
        reason: `keyword/symbol/path score=${score}`,
        score,
        snippets,
      });
    }

    return scored.sort((left, right) => right.score - left.score).slice(0, query.topK);
  }
}
