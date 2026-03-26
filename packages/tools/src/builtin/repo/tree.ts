import path from "node:path";
import type { Tool } from "@renews/core/index";
import { RepoMapBuilder, SymbolIndexer, TreeSitterManager } from "@renews/context/index";
import { WorkspaceFs, RepoTreeBuilder } from "@renews/workspace/index";

export const repoTreeTool: Tool<{ path?: string }, { entries: Array<{ path: string; kind: "file" | "directory" }> }> = {
  name: "repo.tree",
  description: "List repo tree entries.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const builder = new RepoTreeBuilder(new WorkspaceFs(ctx.workspaceRoot));
    return { entries: await builder.build(args.path ?? ".") };
  },
};

export const repoMapTool: Tool<{ maxSymbols?: number }, { repoMap: Awaited<ReturnType<RepoMapBuilder["build"]>> }> = {
  name: "repo.repo_map",
  description: "Build a repo map summary.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const builder = new RepoMapBuilder(new TreeSitterManager());
    return {
      repoMap: await builder.build(ctx.workspaceRoot, args.maxSymbols ?? 1200),
    };
  },
};

export const repoSymbolLookupTool: Tool<{ query: string }, { hits: Array<{ id: string; filePath: string; name: string; kind: string; startLine: number; endLine: number }> }> = {
  name: "repo.symbol_lookup",
  description: "Lookup symbols across the workspace.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    const files = (await fsService.list("."))
      .filter((file) => [".ts", ".tsx", ".js", ".jsx", ".py"].includes(path.extname(file)))
      .map((file) => path.join(ctx.workspaceRoot, file));
    const indexer = new SymbolIndexer(new TreeSitterManager());
    const matches = await indexer.lookupByName(files, args.query);
    return {
      hits: matches.map((entry) => ({
        id: entry.id,
        filePath: entry.filePath,
        name: entry.name,
        kind: entry.kind,
        startLine: entry.startLine,
        endLine: entry.endLine,
      })),
    };
  },
};
