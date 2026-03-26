import type { Tool } from "@renews/core/index";
import { ProcessSandbox } from "@renews/sandbox/index";
import { GitService } from "@renews/workspace/index";

const gitServiceFor = (workspaceRoot: string): GitService =>
  new GitService(
    new ProcessSandbox({
      workspaceRoot,
      writablePaths: ["."],
      blockedCommands: [],
      network: "restricted",
    }),
  );

export const gitStatusTool: Tool<undefined, { output: string }> = {
  name: "git.status",
  description: "Show git status.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx) {
    return { output: await gitServiceFor(ctx.workspaceRoot).status() };
  },
};

export const gitDiffTool: Tool<{ args?: string }, { output: string }> = {
  name: "git.diff",
  description: "Show git diff.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    return { output: await gitServiceFor(ctx.workspaceRoot).diff(args.args ?? "") };
  },
};

export const gitShowTool: Tool<{ ref?: string }, { output: string }> = {
  name: "git.show",
  description: "Show a git object.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    return { output: await gitServiceFor(ctx.workspaceRoot).show(args.ref ?? "HEAD") };
  },
};

export const gitBranchCurrentTool: Tool<undefined, { branch: string }> = {
  name: "git.branch_current",
  description: "Return current git branch name.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx) {
    return { branch: await gitServiceFor(ctx.workspaceRoot).branchCurrent() };
  },
};
