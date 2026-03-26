import { BaseRepository } from "./base-repository.js";

export interface MemoryRecord {
  id: string;
  sessionId?: string;
  scope: string;
  key: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

export class MemoryRepository extends BaseRepository {
  upsert(record: MemoryRecord): void {
    const existing = this.prepare(
      "SELECT id FROM memories WHERE scope = ? AND key = ? AND COALESCE(session_id, '') = COALESCE(?, '')",
    ).get(record.scope, record.key, record.sessionId ?? null) as Record<string, unknown> | undefined;

    if (existing) {
      this.prepare(
        "UPDATE memories SET value_json = ?, updated_at = ? WHERE id = ?",
      ).run(JSON.stringify(record.value), record.updatedAt, String(existing.id));
      return;
    }

    this.prepare(
      `INSERT INTO memories (id, session_id, scope, key, value_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.sessionId ?? null,
      record.scope,
      record.key,
      JSON.stringify(record.value),
      record.createdAt,
      record.updatedAt,
    );
  }

  list(scope: string, sessionId?: string): MemoryRecord[] {
    const sql = sessionId
      ? "SELECT * FROM memories WHERE scope = ? AND session_id = ? ORDER BY updated_at DESC"
      : "SELECT * FROM memories WHERE scope = ? AND session_id IS NULL ORDER BY updated_at DESC";
    const rows = (sessionId ? this.prepare(sql).all(scope, sessionId) : this.prepare(sql).all(scope)) as Array<
      Record<string, unknown>
    >;

    return rows.map((row) => ({
      id: String(row.id),
      sessionId: row.session_id ? String(row.session_id) : undefined,
      scope: String(row.scope),
      key: String(row.key),
      value: JSON.parse(String(row.value_json)),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }
}
