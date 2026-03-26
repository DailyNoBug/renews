export type SessionEventType =
  | "SESSION_CREATED"
  | "PLAN_STARTED"
  | "PLAN_COMPLETED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_REJECTED"
  | "STEP_STARTED"
  | "STEP_COMPLETED"
  | "STEP_FAILED"
  | "TOOL_CALLED"
  | "TOOL_SUCCEEDED"
  | "TOOL_FAILED"
  | "CHECKPOINT_CREATED"
  | "CHECKPOINT_RESTORED"
  | "VALIDATION_STARTED"
  | "VALIDATION_PASSED"
  | "VALIDATION_FAILED"
  | "REPAIR_LOOP_STARTED"
  | "RUN_COMPLETED"
  | "RUN_FAILED"
  | "RUN_BLOCKED"
  | "RUN_CANCELLED";

export interface SessionEvent {
  id: string;
  sessionId: string;
  runId?: string;
  type: SessionEventType;
  payload: unknown;
  createdAt: string;
}
