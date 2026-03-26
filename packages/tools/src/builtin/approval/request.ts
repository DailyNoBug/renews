import type { Tool } from "@renews/core/index";

export const approvalRequestTool: Tool<
  { action: any; payload: Record<string, unknown>; risk: "low" | "medium" | "high"; reason: string },
  { requestId: string; status: string }
> = {
  name: "approval.request",
  description: "Request an approval through the approval service.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    const request = ctx.approvals.ensureApproved({
      sessionId: ctx.sessionId,
      action: args.action,
      payload: args.payload,
      risk: args.risk,
      reason: args.reason,
    });
    return {
      requestId: request.id,
      status: request.status,
    };
  },
};

export const approvalStatusTool: Tool<{ requestId: string }, { request?: unknown }> = {
  name: "approval.status",
  description: "Get approval request status.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "allow" },
  async run(ctx, args) {
    return {
      request: ctx.approvals.status(args.requestId),
    };
  },
};
