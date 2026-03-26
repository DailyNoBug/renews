import type { ExecutionPlan, PlanStep } from "../types/plan.js";

export class Scheduler {
  nextStep(plan: ExecutionPlan): PlanStep | undefined {
    const completed = new Set(
      plan.steps.filter((step) => step.status === "done").map((step) => step.id),
    );

    return plan.steps.find((step) => {
      if (step.status !== "todo") {
        return false;
      }

      return (step.dependsOn ?? []).every((dependencyId) => completed.has(dependencyId));
    });
  }
}
