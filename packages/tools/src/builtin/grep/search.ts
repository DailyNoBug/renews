import fs from "node:fs/promises";
import path from "node:path";
import type { Tool } from "@renews/core/index";
import { WorkspaceFs } from "@renews/workspace/index";

export const grepSearchTool: Tool<
  { query: string; path?: string; limit?: number },
  { matches: Array<{ path: string; line: number; content: string }> }
> = {
  name: "grep.search",
  description: "Search files in the workspace by substring or regex.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    const files = await fsService.list(args.path ?? ".");
    const regex = new RegExp(args.query, "i");
    const matches: Array<{ path: string; line: number; content: string }> = [];

    for (const relativePath of files) {
      const absolutePath = path.join(ctx.workspaceRoot, relativePath);
      const stat = await fs.stat(absolutePath);
      if (stat.isDirectory()) {
        continue;
      }
      const content = await fs.readFile(absolutePath, "utf8");
      const lines = content.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (regex.test(lines[index])) {
          matches.push({
            path: relativePath,
            line: index + 1,
            content: lines[index],
          });
          if (matches.length >= (args.limit ?? 50)) {
            return { matches };
          }
        }
      }
    }

    return { matches };
  },
};
