import type { Tool } from "@renews/core/index";

export const shellExecTool: Tool<
  { command: string; cwd?: string; env?: Record<string, string>; timeoutMs?: number },
  { exitCode: number; stdout: string; stderr: string; durationMs: number; timedOut: boolean }
> = {
  name: "shell.exec",
  description: "Execute a shell command through the configured sandbox.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "ask", action: "run_command", risk: "medium" },
  async run(ctx, args) {
    return ctx.sandbox.exec(args);
  },
};
