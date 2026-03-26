import type { RenewsConfig } from "@renews/config/index";
import type { ApprovalRequest, Checkpoint, ExecutionPlan, PlanStep, SessionEvent, TaskSession } from "@renews/core/index";
import { ApprovalRequiredError, createLogger } from "@renews/core/index";
import { createId, nowIso } from "@renews/shared/index";
import { ContextEngine } from "../shared/context-engine.js";
import type { PlannerOutput } from "../planner/planner-agent.js";
import { PlannerAgent } from "../planner/planner-agent.js";
import { ArchitectAgent } from "../architect/architect-agent.js";
import { EditorAgent } from "../editor/editor-agent.js";
import { ReviewerAgent } from "../reviewer/reviewer-agent.js";
import { TesterAgent } from "../tester/tester-agent.js";
import type { Runtime } from "@renews/core/index";

export interface SupervisorDependencies {
  runtime: Runtime;
  config: RenewsConfig;
  contextEngine: ContextEngine;
  planner: PlannerAgent;
  architect: ArchitectAgent;
  editor: EditorAgent;
  tester: TesterAgent;
  reviewer: ReviewerAgent;
}

export interface SessionRunSummary {
  session: TaskSession;
  plan?: ExecutionPlan;
  approvalsPending: boolean;
  changedFiles: string[];
}

export class SupervisorAgent {
  private readonly logger = createLogger();

  constructor(private readonly deps: SupervisorDependencies) {}

  private emit(sessionId: string, type: any, payload: unknown): void {
    this.deps.runtime.services.storage.events.append({
      id: createId("event"),
      sessionId,
      type,
      payload: payload as any,
      createdAt: nowIso(),
    });
    this.deps.runtime.services.eventBus.publish({
      id: createId("event"),
      sessionId,
      type,
      payload: payload as any,
      createdAt: nowIso(),
    });
  }

  private persistPlan(session: TaskSession, plannerOutput: PlannerOutput): ExecutionPlan {
    const plan: ExecutionPlan = {
      id: createId("plan"),
      sessionId: session.id,
      summary: plannerOutput.summary,
      assumptions: plannerOutput.assumptions,
      risks: plannerOutput.risks,
      requiresApproval: plannerOutput.requiresApproval,
      createdAt: nowIso(),
      steps: plannerOutput.steps.map((step) => ({
        id: createId("step"),
        title: step.title,
        goal: step.goal,
        editablePaths: step.editablePaths,
        validationTargets: step.validationTargets,
        toolIntents: step.toolIntents,
        status: "todo",
      })),
    };
    this.deps.runtime.services.storage.plans.create(plan);
    session.currentPlanId = plan.id;
    session.mode = "act";
    this.deps.runtime.sessions.update(session);
    return plan;
  }

  async plan(sessionId: string): Promise<ExecutionPlan> {
    const session = this.deps.runtime.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    this.deps.runtime.sessions.updateStatus(session, "planning");
    this.emit(session.id, "PLAN_STARTED", { goal: session.userGoal });
    const context = await this.deps.contextEngine.build({
      sessionId: session.id,
      taskSummary: session.userGoal,
      workspaceRoot: session.workspaceRoot,
    });
    const plannerOutput = await this.deps.planner.plan({
      goal: session.userGoal,
      context,
    });
    const plan = this.persistPlan(session, plannerOutput);
    this.deps.contextEngine.rememberSession(session.id, "current_plan_summary", plan.summary);
    this.emit(session.id, "PLAN_COMPLETED", plan);
    if (plan.requiresApproval) {
      try {
        this.deps.runtime.services.approvals.ensureApproved({
          sessionId: session.id,
          action: "run_command",
          payload: {
            planId: plan.id,
            summary: plan.summary,
            stepCount: plan.steps.length,
          },
          risk: "medium",
          reason: "Approve transition from plan mode to act mode",
        });
      } catch (error) {
        if (!(error instanceof ApprovalRequiredError)) {
          throw error;
        }
      }
    }
    this.deps.runtime.sessions.updateStatus(session, plan.requiresApproval ? "awaiting_approval" : "executing");
    return plan;
  }

  private commandsForStep(step: PlanStep): string[] {
    return step.validationTargets?.length
      ? step.validationTargets
      : ["pnpm test", "pnpm lint", "pnpm build"];
  }

  async execute(sessionId: string): Promise<SessionRunSummary> {
    const session = this.deps.runtime.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const plan = session.currentPlanId
      ? this.deps.runtime.services.storage.plans.getById(session.currentPlanId)
      : undefined;
    if (!plan) {
      throw new Error(`No plan found for session ${sessionId}`);
    }

    const changedFiles = new Set<string>();
    if (this.deps.runtime.services.approvals.pending(sessionId).length > 0) {
      this.deps.runtime.sessions.updateStatus(session, "awaiting_approval");
      return {
        session,
        plan,
        approvalsPending: true,
        changedFiles: [],
      };
    }

    try {
      this.deps.runtime.sessions.updateStatus(session, "executing");
      await this.deps.runtime.services.checkpoints.create(session.id, "before-act", session.currentCheckpointId);

      let step = this.deps.runtime.scheduler.nextStep(plan);
      while (step) {
        step.status = "doing";
        this.deps.runtime.services.storage.plans.updateStep(plan.id, step);
        this.emit(session.id, "STEP_STARTED", step);

        let editResult:
          | {
              changedFiles: string[];
              summary: string;
            }
          | undefined;
        let validation:
          | {
              passed: boolean;
              commandResults: Array<{
                command: string;
                exitCode: number;
                stdoutSummary: string;
                stderrSummary: string;
              }>;
              failureSummary?: string;
              suggestedRepairTargets?: string[];
            }
          | undefined;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const context = await this.deps.contextEngine.build({
            sessionId: session.id,
            taskSummary: `${session.userGoal}\n${step.goal}`,
            workspaceRoot: session.workspaceRoot,
            activeFiles: step.editablePaths,
            validationContext: validation?.failureSummary
              ? {
                  latestFailureSummary: validation.failureSummary,
                  commands: this.commandsForStep(step),
                }
              : undefined,
          });
          const instruction = await this.deps.architect.design(step, context);
          editResult = await this.deps.editor.edit(session.id, instruction, context);
          editResult.changedFiles.forEach((file) => changedFiles.add(file));
          session.currentCheckpointId = (
            await this.deps.runtime.services.checkpoints.create(
              session.id,
              `after-${step.id}-attempt-${attempt + 1}`,
              session.currentCheckpointId,
            )
          ).id;
          this.deps.runtime.sessions.update(session);
          this.deps.runtime.sessions.updateStatus(session, "validating");
          this.emit(session.id, "VALIDATION_STARTED", { stepId: step.id, attempt: attempt + 1 });
          validation = await this.deps.tester.validate(
            session.id,
            step.id,
            this.commandsForStep(step),
          );
          if (validation.passed) {
            break;
          }
          this.emit(session.id, "VALIDATION_FAILED", {
            ...validation,
            attempt: attempt + 1,
          });
          if (attempt < 2) {
            this.emit(session.id, "REPAIR_LOOP_STARTED", {
              stepId: step.id,
              attempt: attempt + 1,
            });
          }
        }

        if (!validation?.passed || !editResult) {
          step.status = "failed";
          this.deps.runtime.services.storage.plans.updateStep(plan.id, step);
          this.deps.runtime.sessions.updateStatus(session, "failed");
          throw new Error(validation?.failureSummary ?? "Validation failed");
        }

        this.emit(session.id, "VALIDATION_PASSED", validation);
        await this.deps.runtime.services.checkpoints.create(
          session.id,
          `before-review-${step.id}`,
          session.currentCheckpointId,
        );
        this.deps.runtime.sessions.updateStatus(session, "reviewing");
        const review = await this.deps.reviewer.review({
          goal: session.userGoal,
          changedFiles: editResult.changedFiles,
          validation,
          stepSummary: editResult.summary,
        });
        if (!review.accepted) {
          step.status = "failed";
          this.deps.runtime.services.storage.plans.updateStep(plan.id, step);
          this.deps.runtime.sessions.updateStatus(session, "failed");
          throw new Error(review.requiredFixes.join("; ") || "Review rejected");
        }
        step.status = "done";
        this.deps.runtime.services.storage.plans.updateStep(plan.id, step);
        this.emit(session.id, "STEP_COMPLETED", {
          step,
          changedFiles: editResult.changedFiles,
        });
        this.deps.contextEngine.rememberSession(session.id, `step_${step.id}`, {
          summary: editResult.summary,
          changedFiles: editResult.changedFiles,
        });
        this.deps.runtime.sessions.updateStatus(session, "executing");
        step = this.deps.runtime.scheduler.nextStep(plan);
      }

      this.deps.runtime.sessions.updateStatus(session, "completed");
      this.emit(session.id, "RUN_COMPLETED", {
        changedFiles: [...changedFiles],
      });
      return {
        session,
        plan,
        approvalsPending: false,
        changedFiles: [...changedFiles],
      };
    } catch (error) {
      if (error instanceof ApprovalRequiredError) {
        this.deps.runtime.sessions.updateStatus(session, "awaiting_approval");
        return {
          session,
          plan,
          approvalsPending: true,
          changedFiles: [...changedFiles],
        };
      }

      this.logger.error(error);
      this.deps.runtime.sessions.updateStatus(session, "failed");
      this.emit(session.id, "RUN_FAILED", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async start(goal: string): Promise<SessionRunSummary> {
    const session = this.deps.runtime.createSession(goal);
    const plan = await this.plan(session.id);
    if (plan.requiresApproval) {
      return {
        session,
        plan,
        approvalsPending: true,
        changedFiles: [],
      };
    }
    return this.execute(session.id);
  }

  async resume(sessionId: string): Promise<SessionRunSummary> {
    return this.execute(sessionId);
  }

  status(sessionId: string): {
    session?: TaskSession;
    plan?: ExecutionPlan;
    events: SessionEvent[];
    approvals: ApprovalRequest[];
    checkpoints: Checkpoint[];
  } {
    const session = this.deps.runtime.sessions.get(sessionId);
    return {
      session,
      plan: session?.currentPlanId
        ? this.deps.runtime.services.storage.plans.getById(session.currentPlanId)
        : undefined,
      events: session ? this.deps.runtime.services.storage.events.listBySessionId(sessionId) : [],
      approvals: this.deps.runtime.services.storage.approvals.listPending(sessionId),
      checkpoints: session ? this.deps.runtime.services.storage.checkpoints.listBySessionId(sessionId) : [],
    };
  }
}
