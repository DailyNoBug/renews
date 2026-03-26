import { BaseRepository } from "./base-repository.js";

export interface ValidationRunRecord {
  id: string;
  sessionId: string;
  stepId?: string;
  command: string;
  exitCode?: number;
  stdoutPath?: string;
  stderrPath?: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
}

export class ValidationRepository extends BaseRepository {
  create(record: ValidationRunRecord): void {
    this.prepare(
      `INSERT INTO validation_runs (
        id, session_id, step_id, command, exit_code, stdout_path, stderr_path, status, started_at, finished_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.sessionId,
      record.stepId ?? null,
      record.command,
      record.exitCode ?? null,
      record.stdoutPath ?? null,
      record.stderrPath ?? null,
      record.status,
      record.startedAt,
      record.finishedAt ?? null,
    );
  }

  update(record: ValidationRunRecord): void {
    this.prepare(
      `UPDATE validation_runs
       SET exit_code = ?, stdout_path = ?, stderr_path = ?, status = ?, finished_at = ?
       WHERE id = ?`,
    ).run(
      record.exitCode ?? null,
      record.stdoutPath ?? null,
      record.stderrPath ?? null,
      record.status,
      record.finishedAt ?? null,
      record.id,
    );
  }

  listBySessionId(sessionId: string): ValidationRunRecord[] {
    const rows = this.prepare(
      "SELECT * FROM validation_runs WHERE session_id = ? ORDER BY started_at ASC",
    ).all(sessionId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      stepId: row.step_id ? String(row.step_id) : undefined,
      command: String(row.command),
      exitCode: row.exit_code === null || row.exit_code === undefined ? undefined : Number(row.exit_code),
      stdoutPath: row.stdout_path ? String(row.stdout_path) : undefined,
      stderrPath: row.stderr_path ? String(row.stderr_path) : undefined,
      status: String(row.status),
      startedAt: String(row.started_at),
      finishedAt: row.finished_at ? String(row.finished_at) : undefined,
    }));
  }
}
