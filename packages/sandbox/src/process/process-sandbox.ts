import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { DEFAULT_BLOCKED_COMMAND_PATTERNS } from "@renews/shared/index";
import { ToolExecutionError } from "@renews/core/index";
import { isSubPath, normalizeWorkspacePath } from "@renews/shared/index";
import type { ExecRequest, ExecResult, Sandbox, SandboxOptions } from "../base/types.js";

const ensureAllowedCommand = (command: string, blockedPatterns: string[]): void => {
  const patterns = [...DEFAULT_BLOCKED_COMMAND_PATTERNS, ...blockedPatterns];
  if (patterns.some((pattern) => command.includes(pattern))) {
    throw new ToolExecutionError(`Blocked command pattern detected: ${command}`);
  }
};

const ensureWritable = (workspaceRoot: string, writablePaths: string[], filePath: string): void => {
  const absolutePath = normalizeWorkspacePath(workspaceRoot, filePath);
  const allowed = writablePaths.some((allowedPath) =>
    isSubPath(normalizeWorkspacePath(workspaceRoot, allowedPath), absolutePath),
  );
  if (!allowed) {
    throw new ToolExecutionError(`Path is not writable in sandbox: ${absolutePath}`);
  }
};

export class ProcessSandbox implements Sandbox {
  constructor(private readonly options: SandboxOptions) {}

  async exec(req: ExecRequest): Promise<ExecResult> {
    ensureAllowedCommand(req.command, this.options.blockedCommands);
    const startedAt = Date.now();

    return new Promise<ExecResult>((resolve, reject) => {
      const child = spawn("/bin/sh", ["-lc", req.command], {
        cwd: req.cwd ? normalizeWorkspacePath(this.options.workspaceRoot, req.cwd) : this.options.workspaceRoot,
        env: {
          ...process.env,
          ...req.env,
        },
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer =
        req.timeoutMs && req.timeoutMs > 0
          ? setTimeout(() => {
              timedOut = true;
              child.kill("SIGTERM");
            }, req.timeoutMs)
          : undefined;

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (timer) {
          clearTimeout(timer);
        }
        resolve({
          exitCode: code ?? 1,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
          timedOut,
        });
      });
    });
  }

  async readFile(filePath: string): Promise<string> {
    const resolved = normalizeWorkspacePath(this.options.workspaceRoot, filePath);
    if (!isSubPath(this.options.workspaceRoot, resolved)) {
      throw new ToolExecutionError(`Read outside workspace is not allowed: ${resolved}`);
    }
    return fs.readFile(resolved, "utf8");
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    ensureWritable(this.options.workspaceRoot, this.options.writablePaths, filePath);
    const resolved = normalizeWorkspacePath(this.options.workspaceRoot, filePath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf8");
  }

  async listFiles(targetPath: string): Promise<string[]> {
    const resolved = normalizeWorkspacePath(this.options.workspaceRoot, targetPath);
    if (!isSubPath(this.options.workspaceRoot, resolved)) {
      throw new ToolExecutionError(`List outside workspace is not allowed: ${resolved}`);
    }

    const entries = await fs.readdir(resolved, { withFileTypes: true });
    return entries.map((entry) => path.join(resolved, entry.name));
  }
}
