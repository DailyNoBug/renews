import { ApprovalRequiredError, ToolExecutionError, type Tool, type ToolContext } from "@renews/core/index";
import { createId, nowIso } from "@renews/shared/index";

export interface ToolInvokeOptions {
  stepId?: string;
}

export class ToolRegistry {
  private readonly tools = new Map<string, Tool<any, any>>();

  register<TArgs, TResult>(tool: Tool<TArgs, TResult>): void {
    this.tools.set(tool.name, tool);
  }

  registerMany(tools: Array<Tool<any, any>>): void {
    tools.forEach((tool) => this.register(tool));
  }

  get(name: string): Tool<any, any> | undefined {
    return this.tools.get(name);
  }

  list(): Tool<any, any>[] {
    return [...this.tools.values()];
  }

  async invoke<TResult = unknown>(
    name: string,
    ctx: ToolContext,
    args: unknown,
    options: ToolInvokeOptions = {},
  ): Promise<TResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolExecutionError(`Tool not found: ${name}`);
    }

    const toolCallId = createId("toolcall");
    ctx.storage.toolCalls.create({
      id: toolCallId,
      sessionId: ctx.sessionId,
      stepId: options.stepId,
      toolName: tool.name,
      args,
      status: "running",
      startedAt: nowIso(),
    });
    ctx.storage.events.append({
      id: createId("event"),
      sessionId: ctx.sessionId,
      type: "TOOL_CALLED",
      payload: {
        name: tool.name,
        args,
      },
      createdAt: nowIso(),
    });

    try {
      if (tool.permission.mode === "deny") {
        throw new ToolExecutionError(`Tool is denied by policy: ${tool.name}`);
      }

      if (tool.permission.mode === "ask" && tool.permission.action) {
        ctx.approvals.ensureApproved({
          sessionId: ctx.sessionId,
          action: tool.permission.action as any,
          payload: {
            tool: tool.name,
            args,
          },
          risk: tool.permission.risk ?? "medium",
          reason: `Tool ${tool.name} requires approval`,
        });
      }

      const result = (await tool.run(ctx, args)) as TResult;
      ctx.storage.toolCalls.update({
        id: toolCallId,
        sessionId: ctx.sessionId,
        stepId: options.stepId,
        toolName: tool.name,
        args,
        result,
        status: "succeeded",
        startedAt: nowIso(),
        finishedAt: nowIso(),
      });
      ctx.storage.events.append({
        id: createId("event"),
        sessionId: ctx.sessionId,
        type: "TOOL_SUCCEEDED",
        payload: {
          name: tool.name,
          result,
        },
        createdAt: nowIso(),
      });
      return result;
    } catch (error) {
      ctx.storage.toolCalls.update({
        id: toolCallId,
        sessionId: ctx.sessionId,
        stepId: options.stepId,
        toolName: tool.name,
        args,
        result:
          error instanceof Error
            ? {
                message: error.message,
              }
            : String(error),
        status: error instanceof ApprovalRequiredError ? "awaiting_approval" : "failed",
        startedAt: nowIso(),
        finishedAt: nowIso(),
      });
      ctx.storage.events.append({
        id: createId("event"),
        sessionId: ctx.sessionId,
        type: "TOOL_FAILED",
        payload: {
          name: tool.name,
          error: error instanceof Error ? error.message : String(error),
        },
        createdAt: nowIso(),
      });
      throw error;
    }
  }
}
