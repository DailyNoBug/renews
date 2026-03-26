export type SessionMode = "plan" | "act";

export type SessionStatus =
  | "idle"
  | "planning"
  | "awaiting_approval"
  | "executing"
  | "validating"
  | "reviewing"
  | "completed"
  | "failed"
  | "blocked"
  | "cancelled";

export interface TaskSession {
  id: string;
  workspaceRoot: string;
  repoRoot?: string;
  userGoal: string;
  mode: SessionMode;
  status: SessionStatus;
  currentPlanId?: string;
  currentCheckpointId?: string;
  createdAt: string;
  updatedAt: string;
}
