import path from "node:path";
import type { RenewsConfig } from "@renews/config/index";
import type { StorageFacade } from "@renews/storage/index";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { CheckpointService } from "../checkpoints/checkpoint-service.js";
import type { EventBus } from "../events/event-bus.js";
import { Scheduler } from "../scheduler/scheduler.js";
import { SessionManager } from "./session-manager.js";
import { StateMachine } from "./state-machine.js";

export interface RuntimeServices {
  storage: StorageFacade;
  approvals: ApprovalService;
  checkpoints: CheckpointService;
  eventBus: EventBus;
}

export class Runtime {
  readonly stateMachine = new StateMachine();
  readonly scheduler = new Scheduler();
  readonly sessions: SessionManager;

  constructor(
    readonly config: RenewsConfig,
    readonly services: RuntimeServices,
  ) {
    this.sessions = new SessionManager(services.storage, services.eventBus);
  }

  createSession(goal: string): ReturnType<SessionManager["create"]> {
    return this.sessions.create(
      path.resolve(this.config.project.workspaceRoot),
      goal,
      path.resolve(this.config.project.workspaceRoot),
    );
  }
}
