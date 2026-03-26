import type { StorageFacade } from "@renews/storage/index";
import { createId, nowIso } from "@renews/shared/index";

export class ProjectMemoryStore {
  constructor(private readonly storage: StorageFacade) {}

  set(key: string, value: unknown): void {
    const timestamp = nowIso();
    this.storage.memories.upsert({
      id: createId("mem"),
      scope: "project",
      key,
      value,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  list(): Array<{ key: string; value: unknown; updatedAt: string }> {
    return this.storage.memories.list("project").map((record) => ({
      key: record.key,
      value: record.value,
      updatedAt: record.updatedAt,
    }));
  }
}
