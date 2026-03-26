import { z } from "zod";
import type { ContextBundle } from "@renews/core/index";
import { PatchService, WorkspaceFs, type PatchOperation } from "@renews/workspace/index";
import type { PromptBuilder, StructuredOutputParser } from "@renews/model/index";
import type { EditInstruction } from "../architect/architect-agent.js";
import type { ApprovalService } from "@renews/core/index";

export interface EditorOutput {
  applied: boolean;
  operations: PatchOperation[];
  changedFiles: string[];
  summary: string;
}

const PatchOperationSchema = z.object({
  path: z.string(),
  kind: z.enum(["replace_range", "replace_file", "create_file", "delete_file"]),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  oldText: z.string().optional(),
  newText: z.string().optional(),
});

const EditorOutputSchema = z.object({
  operations: z.array(PatchOperationSchema),
  summary: z.string(),
});

export class EditorAgent {
  constructor(
    private readonly workspaceRoot: string,
    private readonly approvals: ApprovalService,
    private readonly parser?: StructuredOutputParser,
    private readonly promptBuilder?: PromptBuilder,
    private readonly modelName?: string,
  ) {}

  async edit(
    sessionId: string,
    instruction: EditInstruction,
    context: ContextBundle,
    fallbackOperations: PatchOperation[] = [],
  ): Promise<EditorOutput> {
    let operations = fallbackOperations;
    let summary = "No changes generated.";

    if (this.parser && this.promptBuilder && this.modelName) {
      const generated = await this.parser.parse(
        {
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: this.promptBuilder.build({
                systemBase: "You are the Editor agent.",
                currentModePrompt: "Generate precise patch operations for the allowed files only.",
                currentStepPrompt: JSON.stringify(instruction),
                contextBundle: JSON.stringify(context),
              }),
            },
          ],
        },
        EditorOutputSchema,
      );
      operations = generated.operations;
      summary = generated.summary;
    }

    if (operations.length === 0) {
      return {
        applied: true,
        operations: [],
        changedFiles: [],
        summary,
      };
    }

    this.approvals.ensureApproved({
      sessionId,
      action: "write_file",
      payload: {
        stepId: instruction.stepId,
        operations,
      },
      risk: "medium",
      reason: `Editor will apply ${operations.length} patch operations`,
    });

    const service = new PatchService(new WorkspaceFs(this.workspaceRoot));
    const result = await service.apply(operations);
    return {
      applied: result.applied,
      operations,
      changedFiles: result.changedFiles,
      summary: summary || result.summaries.join("; "),
    };
  }
}
