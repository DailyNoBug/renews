import { z } from "zod";
import type { PromptBuilder, StructuredOutputParser } from "@renews/model/index";
import type { ValidationOutput } from "../tester/tester-agent.js";

export interface ReviewOutput {
  accepted: boolean;
  concerns: string[];
  requiredFixes: string[];
  suggestedFiles: string[];
}

const ReviewOutputSchema = z.object({
  accepted: z.boolean(),
  concerns: z.array(z.string()),
  requiredFixes: z.array(z.string()),
  suggestedFiles: z.array(z.string()),
});

export class ReviewerAgent {
  constructor(
    private readonly parser?: StructuredOutputParser,
    private readonly promptBuilder?: PromptBuilder,
    private readonly modelName?: string,
  ) {}

  async review(params: {
    goal: string;
    changedFiles: string[];
    validation: ValidationOutput;
    stepSummary: string;
  }): Promise<ReviewOutput> {
    if (this.parser && this.promptBuilder && this.modelName) {
      return this.parser.parse(
        {
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: this.promptBuilder.build({
                systemBase: "You are the Reviewer agent.",
                currentModePrompt: "Review the implementation and validation output.",
                contextBundle: JSON.stringify(params),
              }),
            },
          ],
        },
        ReviewOutputSchema,
      );
    }

    if (!params.validation.passed) {
      return {
        accepted: false,
        concerns: ["Validation failed"],
        requiredFixes: [params.validation.failureSummary ?? "Fix validation failures"],
        suggestedFiles: params.changedFiles,
      };
    }

    return {
      accepted: true,
      concerns: params.changedFiles.length === 0 ? ["No code changes were produced in this step"] : [],
      requiredFixes: [],
      suggestedFiles: params.changedFiles,
    };
  }
}
