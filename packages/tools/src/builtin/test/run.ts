import type { Tool } from "@renews/core/index";

const createCommandTool = (name: string, description: string): Tool<{ command: string; cwd?: string; timeoutMs?: number }, { exitCode: number; stdout: string; stderr: string; durationMs: number; timedOut: boolean }> => ({
  name,
  description,
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "ask", action: "run_command", risk: "medium" },
  async run(ctx, args) {
    return ctx.sandbox.exec({
      command: args.command,
      cwd: args.cwd,
      timeoutMs: args.timeoutMs ?? 120_000,
    });
  },
});

export const testRunTool = createCommandTool("test.run", "Run test command through sandbox.");
export const lintRunTool = createCommandTool("lint.run", "Run lint command through sandbox.");
export const buildRunTool = createCommandTool("build.run", "Run build command through sandbox.");
