import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ApprovalRequiredError, ApprovalService, EventBus } from "@renews/core/index";
import { StorageFacade } from "@renews/storage/index";

describe("ApprovalService", () => {
  it("creates pending approvals when policy requires it", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "renews-approval-"));
    const storage = new StorageFacade({
      dbPath: path.join(root, "renews.db"),
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
    const service = new ApprovalService(storage, new EventBus(), {
      default: "ask",
      allowReadOnlyToolsWithoutApproval: true,
      requireApprovalFor: ["write_file"],
    });

    expect(() =>
      service.ensureApproved({
        sessionId: "session-1",
        action: "write_file",
        payload: { path: "a.ts" },
        risk: "medium",
        reason: "write",
      }),
    ).toThrowError(ApprovalRequiredError);

    expect(service.pending("session-1")).toHaveLength(1);
  });
});
