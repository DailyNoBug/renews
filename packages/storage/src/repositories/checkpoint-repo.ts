import type { Checkpoint } from "@renews/core/index";
import { BaseRepository } from "./base-repository.js";

export class CheckpointRepository extends BaseRepository {
  create(checkpoint: Checkpoint): void {
    this.prepare(
      `INSERT INTO checkpoints (id, session_id, parent_id, label, manifest_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      checkpoint.id,
      checkpoint.sessionId,
      checkpoint.parentId ?? null,
      checkpoint.label,
      checkpoint.manifestHash,
      checkpoint.createdAt,
    );
  }

  listBySessionId(sessionId: string): Checkpoint[] {
    const rows = this.prepare(
      "SELECT * FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC",
    ).all(sessionId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      parentId: row.parent_id ? String(row.parent_id) : undefined,
      label: String(row.label),
      manifestHash: String(row.manifest_hash),
      createdAt: String(row.created_at),
    }));
  }

  getLatest(sessionId: string): Checkpoint | undefined {
    return this.listBySessionId(sessionId)[0];
  }
}
