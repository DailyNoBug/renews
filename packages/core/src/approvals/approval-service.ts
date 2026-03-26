import { ApprovalRequiredError } from "../errors/errors.js";
import type { ApprovalAction, ApprovalRequest } from "../types/approval.js";
import type { EventBus } from "../events/event-bus.js";
import type { StorageFacade } from "@renews/storage/index";
import { createId, nowIso } from "@renews/shared/index";

export interface ApprovalPolicyConfig {
  default: "ask" | "auto_approve" | "deny";
  allowReadOnlyToolsWithoutApproval: boolean;
  requireApprovalFor: string[];
}

export interface ApprovalDecisionOptions {
  sessionId: string;
  action: ApprovalAction;
  payload: Record<string, unknown>;
  risk: "low" | "medium" | "high";
  reason: string;
}

export class ApprovalService {
  constructor(
    private readonly storage: StorageFacade,
    private readonly eventBus: EventBus,
    private readonly policy: ApprovalPolicyConfig,
  ) {}

  shouldRequestApproval(action: ApprovalAction): boolean {
    if (this.policy.default === "deny") {
      return true;
    }
    if (this.policy.default === "auto_approve") {
      return false;
    }
    return this.policy.requireApprovalFor.includes(action);
  }

  ensureApproved(options: ApprovalDecisionOptions): ApprovalRequest {
    if (!this.shouldRequestApproval(options.action)) {
      const approved: ApprovalRequest = {
        id: createId("approval"),
        sessionId: options.sessionId,
        action: options.action,
        payload: options.payload,
        risk: options.risk,
        reason: options.reason,
        status: "approved",
        createdAt: nowIso(),
        resolvedAt: nowIso(),
      };
      this.storage.approvals.create(approved);
      this.eventBus.publish({
        id: createId("event"),
        sessionId: options.sessionId,
        type: "APPROVAL_GRANTED",
        payload: approved,
        createdAt: nowIso(),
      });
      return approved;
    }

    const existingPending = this.storage.approvals
      .listPending(options.sessionId)
      .find(
        (request) =>
          request.action === options.action &&
          JSON.stringify(request.payload) === JSON.stringify(options.payload) &&
          request.reason === options.reason,
      );

    if (existingPending) {
      throw new ApprovalRequiredError(`Approval is still pending for ${options.action}`, existingPending);
    }

    const request: ApprovalRequest = {
      id: createId("approval"),
      sessionId: options.sessionId,
      action: options.action,
      payload: options.payload,
      risk: options.risk,
      reason: options.reason,
      status: "pending",
      createdAt: nowIso(),
    };
    this.storage.approvals.create(request);
    this.eventBus.publish({
      id: createId("event"),
      sessionId: options.sessionId,
      type: "APPROVAL_REQUESTED",
      payload: request,
      createdAt: nowIso(),
    });
    throw new ApprovalRequiredError(`Approval required for ${options.action}`, request);
  }

  approve(id: string): ApprovalRequest {
    const request = this.storage.approvals.getById(id);
    if (!request) {
      throw new Error(`Approval not found: ${id}`);
    }
    const approved: ApprovalRequest = {
      ...request,
      status: "approved",
      resolvedAt: nowIso(),
    };
    this.storage.approvals.update(approved);
    this.eventBus.publish({
      id: createId("event"),
      sessionId: approved.sessionId,
      type: "APPROVAL_GRANTED",
      payload: approved,
      createdAt: nowIso(),
    });
    return approved;
  }

  reject(id: string): ApprovalRequest {
    const request = this.storage.approvals.getById(id);
    if (!request) {
      throw new Error(`Approval not found: ${id}`);
    }
    const rejected: ApprovalRequest = {
      ...request,
      status: "rejected",
      resolvedAt: nowIso(),
    };
    this.storage.approvals.update(rejected);
    this.eventBus.publish({
      id: createId("event"),
      sessionId: rejected.sessionId,
      type: "APPROVAL_REJECTED",
      payload: rejected,
      createdAt: nowIso(),
    });
    return rejected;
  }

  status(id: string): ApprovalRequest | undefined {
    return this.storage.approvals.getById(id);
  }

  pending(sessionId?: string): ApprovalRequest[] {
    return this.storage.approvals.listPending(sessionId);
  }
}
