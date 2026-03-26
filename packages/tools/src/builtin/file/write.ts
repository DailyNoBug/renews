import type { Tool } from "@renews/core/index";
import { WorkspaceFs } from "@renews/workspace/index";

export const fileWriteTool: Tool<{ path: string; content: string }, { path: string; written: boolean }> = {
  name: "file.write",
  description: "Write a file in the workspace.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "ask", action: "write_file", risk: "medium" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    await fsService.write(args.path, args.content);
    return { path: args.path, written: true };
  },
};

export const fileAppendTool: Tool<{ path: string; content: string }, { path: string; appended: boolean }> = {
  name: "file.append",
  description: "Append content to a file in the workspace.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "ask", action: "write_file", risk: "low" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    await fsService.append(args.path, args.content);
    return { path: args.path, appended: true };
  },
};

export const fileDeleteTool: Tool<{ path: string }, { path: string; deleted: boolean }> = {
  name: "file.delete",
  description: "Delete a file or directory in the workspace.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "ask", action: "delete_file", risk: "high" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    await fsService.delete(args.path);
    return { path: args.path, deleted: true };
  },
};

export const fileListTool: Tool<{ path?: string }, { entries: string[] }> = {
  name: "file.list",
  description: "List workspace files recursively.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    return { entries: await fsService.list(args.path ?? ".") };
  },
};

export const fileStatTool: Tool<{ path: string }, { path: string; exists: boolean; isDirectory?: boolean; size?: number; modifiedAt?: string }> = {
  name: "file.stat",
  description: "Return file metadata.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    return fsService.stat(args.path);
  },
};
