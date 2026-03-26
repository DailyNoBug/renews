import type { ValidationRepository } from "@renews/storage/index";
import { createId, nowIso } from "@renews/shared/index";
import type { Sandbox } from "@renews/sandbox/index";
import type { ApprovalService } from "@renews/core/index";

export interface ValidationOutput {
  passed: boolean;
  commandResults: Array<{
    command: string;
    exitCode: number;
    stdoutSummary: string;
    stderrSummary: string;
  }>;
  failureSummary?: string;
  suggestedRepairTargets?: string[];
}

export class TesterAgent {
  constructor(
    private readonly sandbox: Sandbox,
    private readonly validationRepository: ValidationRepository,
    private readonly approvals: ApprovalService,
  ) {}

  private summarize(output: string): string {
    return output.trim().split(/\r?\n/).slice(0, 10).join("\n");
  }

  async validate(sessionId: string, stepId: string | undefined, commands: string[]): Promise<ValidationOutput> {
    const commandResults: ValidationOutput["commandResults"] = [];

    for (const command of commands) {
      this.approvals.ensureApproved({
        sessionId,
        action: "run_command",
        payload: { command, stepId },
        risk: "medium",
        reason: `Tester will run validation command: ${command}`,
      });
      const recordId = createId("validation");
      this.validationRepository.create({
        id: recordId,
        sessionId,
        stepId,
        command,
        status: "running",
        startedAt: nowIso(),
      });
      const result = await this.sandbox.exec({
        command,
        timeoutMs: 120_000,
      });
      this.validationRepository.update({
        id: recordId,
        sessionId,
        stepId,
        command,
        exitCode: result.exitCode,
        status: result.exitCode === 0 ? "passed" : "failed",
        startedAt: nowIso(),
        finishedAt: nowIso(),
      });
      commandResults.push({
        command,
        exitCode: result.exitCode,
        stdoutSummary: this.summarize(result.stdout),
        stderrSummary: this.summarize(result.stderr),
      });
      if (result.exitCode !== 0) {
        return {
          passed: false,
          commandResults,
          failureSummary: `${command} failed: ${this.summarize(result.stderr || result.stdout)}`,
          suggestedRepairTargets: [],
        };
      }
    }

    return {
      passed: true,
      commandResults,
    };
  }
}
