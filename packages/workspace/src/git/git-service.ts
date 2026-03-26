import { ProcessSandbox } from "@renews/sandbox/index";

export class GitService {
  constructor(private readonly sandbox: ProcessSandbox) {}

  private async execGit(command: string): Promise<string> {
    const result = await this.sandbox.exec({
      command: `git ${command}`,
      timeoutMs: 30_000,
    });
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `git ${command} failed`);
    }
    return result.stdout.trim();
  }

  status(): Promise<string> {
    return this.execGit("status --short");
  }

  diff(args = ""): Promise<string> {
    return this.execGit(`diff ${args}`.trim());
  }

  show(ref = "HEAD"): Promise<string> {
    return this.execGit(`show ${ref}`);
  }

  branchCurrent(): Promise<string> {
    return this.execGit("branch --show-current");
  }
}
