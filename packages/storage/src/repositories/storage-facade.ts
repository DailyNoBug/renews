import path from "node:path";
import { fileURLToPath } from "node:url";
import { SqliteClient } from "../sqlite/client.js";
import { runMigrations } from "../sqlite/migrate.js";
import { ApprovalRepository } from "./approval-repo.js";
import { CheckpointRepository } from "./checkpoint-repo.js";
import { EventRepository } from "./event-repo.js";
import { MemoryRepository } from "./memory-repo.js";
import { PlanRepository } from "./plan-repo.js";
import { SessionRepository } from "./session-repo.js";
import { ToolCallRepository } from "./tool-call-repo.js";
import { ValidationRepository } from "./validation-repo.js";

export interface StorageFacadeOptions {
  dbPath: string;
  migrationsDir?: string;
}

const defaultMigrationsDir = (): string =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

export class StorageFacade {
  readonly client: SqliteClient;
  readonly sessions: SessionRepository;
  readonly plans: PlanRepository;
  readonly events: EventRepository;
  readonly approvals: ApprovalRepository;
  readonly checkpoints: CheckpointRepository;
  readonly memories: MemoryRepository;
  readonly validations: ValidationRepository;
  readonly toolCalls: ToolCallRepository;

  constructor(options: StorageFacadeOptions) {
    this.client = new SqliteClient(options.dbPath);
    runMigrations(
      this.client,
      options.migrationsDir ?? defaultMigrationsDir(),
    );
    const db = this.client.db;
    this.sessions = new SessionRepository(db);
    this.plans = new PlanRepository(db);
    this.events = new EventRepository(db);
    this.approvals = new ApprovalRepository(db);
    this.checkpoints = new CheckpointRepository(db);
    this.memories = new MemoryRepository(db);
    this.validations = new ValidationRepository(db);
    this.toolCalls = new ToolCallRepository(db);
  }

  close(): void {
    this.client.close();
  }
}
