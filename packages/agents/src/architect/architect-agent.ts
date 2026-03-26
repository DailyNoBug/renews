import { z } from "zod";
import type { ContextBundle, PlanStep } from "@renews/core/index";
import type { PromptBuilder, StructuredOutputParser } from "@renews/model/index";

export interface EditInstruction {
  stepId: string;
  targetFiles: string[];
  strategy: string;
  constraints: string[];
  expectedChanges: Array<{
    filePath: string;
    changeType: "modify" | "create" | "delete";
    targets?: string[];
  }>;
}

const EditInstructionSchema = z.object({
  stepId: z.string(),
  targetFiles: z.array(z.string()),
  strategy: z.string(),
  constraints: z.array(z.string()),
  expectedChanges: z.array(
    z.object({
      filePath: z.string(),
      changeType: z.enum(["modify", "create", "delete"]),
      targets: z.array(z.string()).optional(),
    }),
  ),
});

export class ArchitectAgent {
  constructor(
    private readonly parser?: StructuredOutputParser,
    private readonly promptBuilder?: PromptBuilder,
    private readonly modelName?: string,
  ) {}

  async design(step: PlanStep, context: ContextBundle): Promise<EditInstruction> {
    if (this.parser && this.promptBuilder && this.modelName) {
      return this.parser.parse(
        {
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: this.promptBuilder.build({
                systemBase: "You are the Architect agent.",
                currentModePrompt: "Design edits but do not write files.",
                currentStepPrompt: JSON.stringify(step),
                contextBundle: JSON.stringify(context),
              }),
            },
          ],
        },
        EditInstructionSchema,
      );
    }

    const targetFiles =
      step.editablePaths?.length
        ? step.editablePaths
        : context.retrievalHits.slice(0, 4).map((hit) => hit.filePath);

    return {
      stepId: step.id,
      targetFiles,
      strategy: `优先最小改动，围绕 ${targetFiles.join(", ") || "相关文件"} 完成 ${step.goal}`,
      constraints: [
        "仅修改本步骤相关文件",
        "保持 patch 尽量小",
        "保留现有代码风格",
      ],
      expectedChanges: targetFiles.map((filePath) => ({
        filePath,
        changeType: "modify",
      })),
    };
  }
}
