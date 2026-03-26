import type { SessionEvent } from "@renews/core/index";
import { BaseRepository } from "./base-repository.js";

export class EventRepository extends BaseRepository {
  append(event: SessionEvent): void {
    this.prepare(
      `INSERT INTO events (id, session_id, run_id, type, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      event.id,
      event.sessionId,
      event.runId ?? null,
      event.type,
      JSON.stringify(event.payload),
      event.createdAt,
    );
  }

  listBySessionId(sessionId: string): SessionEvent[] {
    const rows = this.prepare(
      "SELECT * FROM events WHERE session_id = ? ORDER BY created_at ASC",
    ).all(sessionId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      runId: row.run_id ? String(row.run_id) : undefined,
      type: String(row.type) as SessionEvent["type"],
      payload: JSON.parse(String(row.payload_json)),
      createdAt: String(row.created_at),
    }));
  }
}
