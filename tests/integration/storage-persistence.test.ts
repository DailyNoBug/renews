import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { StorageFacade } from "@renews/storage/index";

describe("StorageFacade", () => {
  it("persists sessions in sqlite", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renews-storage-"));
    const dbPath = path.join(root, "renews.db");
    const storage = new StorageFacade({
      dbPath,
      migrationsDir: path.resolve("packages/storage/src/migrations"),
    });
    storage.sessions.create({
      id: "session-1",
      workspaceRoot: root,
      userGoal: "goal",
      mode: "plan",
      status: "idle",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const reloaded = new StorageFacade({
      dbPath,
      migrationsDir: path.resolve("packages/storage/src/migrations"),
    });

    expect(reloaded.sessions.getById("session-1")?.userGoal).toBe("goal");
  });
});
