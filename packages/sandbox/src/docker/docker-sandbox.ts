import path from "node:path";
import fs from "node:fs/promises";
import { ProcessSandbox } from "../process/process-sandbox.js";
import type { ExecRequest, ExecResult, Sandbox, SandboxOptions } from "../base/types.js";

export class DockerSandbox implements Sandbox {
  private readonly helper: ProcessSandbox;

  constructor(private readonly options: SandboxOptions) {
    this.helper = new ProcessSandbox(options);
  }

  async exec(req: ExecRequest): Promise<ExecResult> {
    const workspaceRoot = path.resolve(this.options.workspaceRoot);
    const cwd = req.cwd ? path.posix.join("/workspace", req.cwd) : "/workspace";
    const networkFlag = this.options.network === "restricted" ? "--network none" : "";
    const command = [
      "docker run --rm -i",
      networkFlag,
      `-v "${workspaceRoot}:/workspace"`,
      `-w "${cwd}"`,
      this.options.dockerImage ?? "renews-agent:base",
      `/bin/sh -lc ${JSON.stringify(req.command)}`,
    ]
      .filter(Boolean)
      .join(" ");

    return this.helper.exec({
      ...req,
      command,
      cwd: this.options.workspaceRoot,
    });
  }

  readFile(filePath: string): Promise<string> {
    return this.helper.readFile(filePath);
  }

  writeFile(filePath: string, content: string): Promise<void> {
    return this.helper.writeFile(filePath, content);
  }

  async listFiles(targetPath: string): Promise<string[]> {
    return this.helper.listFiles(targetPath);
  }

  async destroy(): Promise<void> {
    await fs.access(this.options.workspaceRoot);
  }
}
