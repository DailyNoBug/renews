export interface ExecRequest {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  approvalAction?: string;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface Sandbox {
  exec(req: ExecRequest): Promise<ExecResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  destroy?(): Promise<void>;
}

export interface SandboxOptions {
  workspaceRoot: string;
  writablePaths: string[];
  blockedCommands: string[];
  network?: "restricted" | "enabled";
  dockerImage?: string;
}
