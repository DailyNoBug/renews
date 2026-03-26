import type { Tool } from "@renews/core/index";
import { WorkspaceFs } from "@renews/workspace/index";

export const fileReadTool: Tool<
  { path: string; startLine?: number; endLine?: number },
  { path: string; content: string; truncated: boolean; startLine?: number; endLine?: number }
> = {
  name: "file.read",
  description: "Read a file or a range of lines from the workspace.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    return fsService.read(args.path, args.startLine, args.endLine);
  },
};
