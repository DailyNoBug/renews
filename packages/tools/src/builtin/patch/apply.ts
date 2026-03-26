import type { Tool } from "@renews/core/index";
import { PatchService, WorkspaceFs, createUnifiedDiff, type PatchOperation } from "@renews/workspace/index";

export const patchApplyTool: Tool<{ operations: PatchOperation[] }, { applied: boolean; changedFiles: string[]; summaries: string[] }> = {
  name: "patch.apply",
  description: "Apply patch operations inside the workspace.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "ask", action: "write_file", risk: "medium" },
  async run(ctx, args) {
    const patchService = new PatchService(new WorkspaceFs(ctx.workspaceRoot));
    return patchService.apply(args.operations);
  },
};

export const patchPreviewTool: Tool<{ path: string; newContent: string }, { diff: string }> = {
  name: "patch.preview",
  description: "Preview a whole-file change as a unified diff.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const fsService = new WorkspaceFs(ctx.workspaceRoot);
    const before = await fsService.read(args.path).catch(() => ({
      content: "",
    }));
    return {
      diff: createUnifiedDiff(args.path, before.content, args.newContent),
    };
  },
};

export const diffUnifiedTool: Tool<{ path: string; before: string; after: string }, { diff: string }> = {
  name: "diff.unified",
  description: "Create a unified diff between two texts.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(_ctx, args) {
    return {
      diff: createUnifiedDiff(args.path, args.before, args.after),
    };
  },
};
