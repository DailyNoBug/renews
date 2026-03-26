import { emptyMetrics, type EvalMetrics } from "../metrics/metrics.js";
import type { EvalTask } from "../datasets/sample-dataset.js";

export interface EvalResult {
  metrics: EvalMetrics;
  tasks: Array<{
    repo: string;
    goal: string;
    passed: boolean;
    notes?: string;
  }>;
}

export class EvalHarness {
  async run(tasks: EvalTask[]): Promise<EvalResult> {
    return {
      metrics: emptyMetrics(),
      tasks: tasks.map((task) => ({
        repo: task.repo,
        goal: task.goal,
        passed: false,
        notes: "Hook this harness to the runtime for automated benchmark execution.",
      })),
    };
  }
}
