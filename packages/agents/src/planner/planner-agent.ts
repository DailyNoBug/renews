import { z } from "zod";
import { PlannerOutputSchema } from "@renews/shared/index";
import type { ContextBundle } from "@renews/core/index";
import type { PromptBuilder, StructuredOutputParser } from "@renews/model/index";

export interface PlannerInput {
  goal: string;
  context: ContextBundle;
}

export interface PlannerOutput {
  summary: string;
  assumptions: string[];
  risks: string[];
  requiresApproval: boolean;
  steps: Array<{
    title: string;
    goal: string;
    editablePaths?: string[];
    validationTargets?: string[];
    toolIntents: string[];
  }>;
}

export class PlannerAgent {
  constructor(
    private readonly parser?: StructuredOutputParser,
    private readonly promptBuilder?: PromptBuilder,
    private readonly modelName?: string,
  ) {}

  async plan(input: PlannerInput): Promise<PlannerOutput> {
    if (this.parser && this.promptBuilder && this.modelName) {
      return this.parser.parse(
        {
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: this.promptBuilder.build({
                systemBase: "You are the Planner agent for a coding task.",
                currentModePrompt: "Generate a structured execution plan without editing files.",
                contextBundle: JSON.stringify(input.context),
                outputSchema: JSON.stringify(PlannerOutputSchema.shape),
              }),
            },
            {
              role: "user",
              content: input.goal,
            },
          ],
        },
        PlannerOutputSchema,
      );
    }

    const topFiles = input.context.retrievalHits.slice(0, 6).map((hit) => hit.filePath);
    const validationCommands = ["pnpm test", "pnpm lint", "pnpm build"];
    return {
      summary: `完成任务：${input.goal}`,
      assumptions: topFiles.length > 0 ? [`主要修改文件集中在 ${topFiles.join(", ")}`] : ["需要先探索仓库结构"],
      risks: [
        "可能存在隐藏的跨模块引用",
        "可能需要额外测试或构建修复",
      ],
      requiresApproval: true,
      steps: [
        {
          title: "Inspect relevant code",
          goal: "定位相关模块、测试入口与关键符号",
          editablePaths: topFiles,
          validationTargets: validationCommands,
          toolIntents: ["repo.repo_map", "repo.symbol_lookup", "grep.search", "file.read"],
        },
        {
          title: "Implement code changes",
          goal: "按任务要求完成代码修改",
          editablePaths: topFiles,
          validationTargets: validationCommands,
          toolIntents: ["patch.preview", "patch.apply", "file.write"],
        },
        {
          title: "Validate and review",
          goal: "运行验证并完成最终审查",
          editablePaths: topFiles,
          validationTargets: validationCommands,
          toolIntents: ["test.run", "lint.run", "build.run"],
        },
      ],
    };
  }
}
