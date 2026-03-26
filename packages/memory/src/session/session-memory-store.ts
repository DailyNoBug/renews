import type { StorageFacade } from "@renews/storage/index";
import { createId, nowIso } from "@renews/shared/index";

export class SessionMemoryStore {
  constructor(private readonly storage: StorageFacade) {}

  set(sessionId: string, key: string, value: unknown): void {
    const timestamp = nowIso();
    this.storage.memories.upsert({
      id: createId("mem"),
      sessionId,
      scope: "session",
      key,
      value,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  list(sessionId: string): Array<{ key: string; value: unknown; updatedAt: string }> {
    return this.storage.memories.list("session", sessionId).map((record) => ({
      key: record.key,
      value: record.value,
      updatedAt: record.updatedAt,
    }));
  }
}
