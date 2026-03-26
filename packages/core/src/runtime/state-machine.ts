import type { SessionStatus } from "../types/session.js";

const transitions: Record<SessionStatus, SessionStatus[]> = {
  idle: ["planning", "blocked", "cancelled", "awaiting_approval"],
  planning: ["awaiting_approval", "executing", "failed", "blocked", "cancelled"],
  awaiting_approval: ["planning", "executing", "blocked", "cancelled", "failed"],
  executing: ["validating", "awaiting_approval", "failed", "blocked", "cancelled"],
  validating: ["executing", "reviewing", "failed", "blocked", "cancelled"],
  reviewing: ["executing", "completed", "failed", "blocked", "cancelled"],
  completed: [],
  failed: [],
  blocked: ["planning", "executing", "cancelled", "failed"],
  cancelled: [],
};

export class StateMachine {
  canTransition(from: SessionStatus, to: SessionStatus): boolean {
    return transitions[from].includes(to);
  }

  transition(from: SessionStatus, to: SessionStatus): SessionStatus {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid session transition: ${from} -> ${to}`);
    }

    return to;
  }
}
