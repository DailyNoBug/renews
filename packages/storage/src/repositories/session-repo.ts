import type { TaskSession } from "@renews/core/index";
import { safeJsonParse } from "@renews/shared/index";
import { BaseRepository } from "./base-repository.js";

export class SessionRepository extends BaseRepository {
  create(session: TaskSession): void {
    this.prepare(
      `INSERT INTO sessions (
        id, workspace_root, repo_root, user_goal, mode, status, current_plan_id, current_checkpoint_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      session.id,
      session.workspaceRoot,
      session.repoRoot ?? null,
      session.userGoal,
      session.mode,
      session.status,
      session.currentPlanId ?? null,
      session.currentCheckpointId ?? null,
      session.createdAt,
      session.updatedAt,
    );
  }

  update(session: TaskSession): void {
    this.prepare(
      `UPDATE sessions
       SET workspace_root = ?,
           repo_root = ?,
           user_goal = ?,
           mode = ?,
           status = ?,
           current_plan_id = ?,
           current_checkpoint_id = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      session.workspaceRoot,
      session.repoRoot ?? null,
      session.userGoal,
      session.mode,
      session.status,
      session.currentPlanId ?? null,
      session.currentCheckpointId ?? null,
      session.updatedAt,
      session.id,
    );
  }

  getById(id: string): TaskSession | undefined {
    const row = this.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: String(row.id),
      workspaceRoot: String(row.workspace_root),
      repoRoot: row.repo_root ? String(row.repo_root) : undefined,
      userGoal: String(row.user_goal),
      mode: String(row.mode) as TaskSession["mode"],
      status: String(row.status) as TaskSession["status"],
      currentPlanId: row.current_plan_id ? String(row.current_plan_id) : undefined,
      currentCheckpointId: row.current_checkpoint_id ? String(row.current_checkpoint_id) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  list(): TaskSession[] {
    const rows = this.prepare("SELECT * FROM sessions ORDER BY created_at DESC").all() as Array<
      Record<string, unknown>
    >;
    return rows.map((row) => this.getById(String(row.id))!).filter(Boolean);
  }
}
