import type { ApprovalRequest } from "@renews/core/index";
import { BaseRepository } from "./base-repository.js";

export class ApprovalRepository extends BaseRepository {
  create(request: ApprovalRequest): void {
    this.prepare(
      `INSERT INTO approvals (id, session_id, action, payload_json, risk, reason, status, created_at, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      request.id,
      request.sessionId,
      request.action,
      JSON.stringify(request.payload),
      request.risk,
      request.reason,
      request.status,
      request.createdAt,
      request.resolvedAt ?? null,
    );
  }

  update(request: ApprovalRequest): void {
    this.prepare(
      `UPDATE approvals
       SET payload_json = ?, risk = ?, reason = ?, status = ?, resolved_at = ?
       WHERE id = ?`,
    ).run(
      JSON.stringify(request.payload),
      request.risk,
      request.reason,
      request.status,
      request.resolvedAt ?? null,
      request.id,
    );
  }

  listPending(sessionId?: string): ApprovalRequest[] {
    const sql = sessionId
      ? "SELECT * FROM approvals WHERE status = 'pending' AND session_id = ? ORDER BY created_at ASC"
      : "SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at ASC";
    const rows = (sessionId ? this.prepare(sql).all(sessionId) : this.prepare(sql).all()) as Array<
      Record<string, unknown>
    >;

    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      action: String(row.action) as ApprovalRequest["action"],
      payload: JSON.parse(String(row.payload_json)),
      risk: String(row.risk) as ApprovalRequest["risk"],
      reason: String(row.reason),
      status: String(row.status) as ApprovalRequest["status"],
      createdAt: String(row.created_at),
      resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
    }));
  }

  getById(id: string): ApprovalRequest | undefined {
    const row = this.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;

    return row
      ? {
          id: String(row.id),
          sessionId: String(row.session_id),
          action: String(row.action) as ApprovalRequest["action"],
          payload: JSON.parse(String(row.payload_json)),
          risk: String(row.risk) as ApprovalRequest["risk"],
          reason: String(row.reason),
          status: String(row.status) as ApprovalRequest["status"],
          createdAt: String(row.created_at),
          resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
        }
      : undefined;
  }
}
