export interface PlanStep {
  id: string;
  title: string;
  goal: string;
  editablePaths?: string[];
  validationTargets?: string[];
  toolIntents: string[];
  dependsOn?: string[];
  status: "todo" | "doing" | "done" | "failed" | "skipped";
}

export interface ExecutionPlan {
  id: string;
  sessionId: string;
  summary: string;
  assumptions: string[];
  risks: string[];
  requiresApproval: boolean;
  steps: PlanStep[];
  createdAt: string;
}
