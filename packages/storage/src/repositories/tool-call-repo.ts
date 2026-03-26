import { BaseRepository } from "./base-repository.js";

export interface ToolCallRecord {
  id: string;
  sessionId: string;
  stepId?: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  status: string;
  stdoutPath?: string;
  stderrPath?: string;
  startedAt: string;
  finishedAt?: string;
}

export class ToolCallRepository extends BaseRepository {
  create(record: ToolCallRecord): void {
    this.prepare(
      `INSERT INTO tool_calls (
        id, session_id, step_id, tool_name, args_json, result_json, status, stdout_path, stderr_path, started_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.sessionId,
      record.stepId ?? null,
      record.toolName,
      JSON.stringify(record.args),
      record.result ? JSON.stringify(record.result) : null,
      record.status,
      record.stdoutPath ?? null,
      record.stderrPath ?? null,
      record.startedAt,
      record.finishedAt ?? null,
    );
  }

  update(record: ToolCallRecord): void {
    this.prepare(
      `UPDATE tool_calls
       SET result_json = ?, status = ?, stdout_path = ?, stderr_path = ?, finished_at = ?
       WHERE id = ?`,
    ).run(
      record.result ? JSON.stringify(record.result) : null,
      record.status,
      record.stdoutPath ?? null,
      record.stderrPath ?? null,
      record.finishedAt ?? null,
      record.id,
    );
  }
}
