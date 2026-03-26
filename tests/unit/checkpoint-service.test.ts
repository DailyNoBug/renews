import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CheckpointService, EventBus } from "@renews/core/index";
import { StorageFacade } from "@renews/storage/index";

describe("CheckpointService", () => {
  it("creates a content addressed snapshot", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renews-checkpoint-"));
    await fs.writeFile(path.join(root, "a.ts"), "export const a = 1;\n", "utf8");
    const storage = new StorageFacade({
      dbPath: path.join(root, ".renews", "renews.db"),
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
    const service = new CheckpointService(storage, new EventBus(), {
      workspaceRoot: root,
    });

    const checkpoint = await service.create("session-1", "initial");
    const manifestPath = path.join(root, ".renews", "checkpoints", "manifests", `${checkpoint.id}.json`);
    await expect(fs.stat(manifestPath)).resolves.toBeDefined();
  });
});
