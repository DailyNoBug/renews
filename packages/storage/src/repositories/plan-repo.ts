import type { ExecutionPlan, PlanStep } from "@renews/core/index";
import { BaseRepository } from "./base-repository.js";

export class PlanRepository extends BaseRepository {
  create(plan: ExecutionPlan): void {
    this.prepare(
      `INSERT INTO plans (id, session_id, summary, assumptions_json, risks_json, requires_approval, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      plan.id,
      plan.sessionId,
      plan.summary,
      JSON.stringify(plan.assumptions),
      JSON.stringify(plan.risks),
      plan.requiresApproval ? 1 : 0,
      plan.createdAt,
    );

    const stmt = this.prepare(
      `INSERT INTO plan_steps (
        id, plan_id, title, goal, editable_paths_json, validation_targets_json, tool_intents_json, depends_on_json, status, sort_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    plan.steps.forEach((step, index) => {
      stmt.run(
        step.id,
        plan.id,
        step.title,
        step.goal,
        step.editablePaths ? JSON.stringify(step.editablePaths) : null,
        step.validationTargets ? JSON.stringify(step.validationTargets) : null,
        JSON.stringify(step.toolIntents),
        step.dependsOn ? JSON.stringify(step.dependsOn) : null,
        step.status,
        index,
      );
    });
  }

  updateStep(planId: string, step: PlanStep): void {
    this.prepare(
      `UPDATE plan_steps
       SET title = ?, goal = ?, editable_paths_json = ?, validation_targets_json = ?, tool_intents_json = ?, depends_on_json = ?, status = ?
       WHERE id = ? AND plan_id = ?`,
    ).run(
      step.title,
      step.goal,
      step.editablePaths ? JSON.stringify(step.editablePaths) : null,
      step.validationTargets ? JSON.stringify(step.validationTargets) : null,
      JSON.stringify(step.toolIntents),
      step.dependsOn ? JSON.stringify(step.dependsOn) : null,
      step.status,
      step.id,
      planId,
    );
  }

  getById(id: string): ExecutionPlan | undefined {
    const planRow = this.prepare("SELECT * FROM plans WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;

    if (!planRow) {
      return undefined;
    }

    const stepRows = this.prepare(
      "SELECT * FROM plan_steps WHERE plan_id = ? ORDER BY sort_index ASC",
    ).all(id) as Array<Record<string, unknown>>;

    return {
      id: String(planRow.id),
      sessionId: String(planRow.session_id),
      summary: String(planRow.summary),
      assumptions: JSON.parse(String(planRow.assumptions_json)),
      risks: JSON.parse(String(planRow.risks_json)),
      requiresApproval: Number(planRow.requires_approval) === 1,
      createdAt: String(planRow.created_at),
      steps: stepRows.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        goal: String(row.goal),
        editablePaths: row.editable_paths_json ? JSON.parse(String(row.editable_paths_json)) : undefined,
        validationTargets: row.validation_targets_json
          ? JSON.parse(String(row.validation_targets_json))
          : undefined,
        toolIntents: JSON.parse(String(row.tool_intents_json)),
        dependsOn: row.depends_on_json ? JSON.parse(String(row.depends_on_json)) : undefined,
        status: String(row.status) as PlanStep["status"],
      })),
    };
  }

  getBySessionId(sessionId: string): ExecutionPlan | undefined {
    const row = this.prepare(
      "SELECT id FROM plans WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
    ).get(sessionId) as Record<string, unknown> | undefined;

    return row ? this.getById(String(row.id)) : undefined;
  }
}
