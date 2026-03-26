import type { JsonSchema } from "@renews/shared/index";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { StorageFacade } from "@renews/storage/index";
import type { Logger } from "../runtime/logger.js";
import type { Sandbox } from "@renews/sandbox/index";

export interface PermissionPolicy {
  mode: "allow" | "ask" | "deny";
  action?: string;
  risk?: "low" | "medium" | "high";
}

export interface ToolContext {
  sessionId: string;
  workspaceRoot: string;
  repoRoot?: string;
  sandbox: Sandbox;
  approvals: ApprovalService;
  logger: Logger;
  storage: StorageFacade;
}

export interface Tool<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  permission: PermissionPolicy;
  timeoutMs?: number;
  idempotent?: boolean;
  run(ctx: ToolContext, args: TArgs): Promise<TResult>;
}
