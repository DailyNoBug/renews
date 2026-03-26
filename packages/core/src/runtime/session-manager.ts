import type { TaskSession, SessionStatus } from "../types/session.js";
import type { StorageFacade } from "@renews/storage/index";
import type { EventBus } from "../events/event-bus.js";
import { createId, nowIso } from "@renews/shared/index";

export class SessionManager {
  constructor(
    private readonly storage: StorageFacade,
    private readonly eventBus: EventBus,
  ) {}

  create(workspaceRoot: string, userGoal: string, repoRoot?: string): TaskSession {
    const session: TaskSession = {
      id: createId("session"),
      workspaceRoot,
      repoRoot,
      userGoal,
      mode: "plan",
      status: "idle",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.storage.sessions.create(session);
    this.eventBus.publish({
      id: createId("event"),
      sessionId: session.id,
      type: "SESSION_CREATED",
      payload: session,
      createdAt: nowIso(),
    });
    return session;
  }

  get(id: string): TaskSession | undefined {
    return this.storage.sessions.getById(id);
  }

  update(session: TaskSession): TaskSession {
    session.updatedAt = nowIso();
    this.storage.sessions.update(session);
    return session;
  }

  updateStatus(session: TaskSession, status: SessionStatus): TaskSession {
    session.status = status;
    return this.update(session);
  }
}
