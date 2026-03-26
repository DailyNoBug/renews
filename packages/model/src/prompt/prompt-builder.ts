export interface PromptLayers {
  systemBase: string;
  orgPolicy?: string;
  projectRules?: string;
  relevantSkills?: string;
  workflowHints?: string;
  sessionMemorySummary?: string;
  currentModePrompt: string;
  currentStepPrompt?: string;
  contextBundle?: string;
  toolContracts?: string;
  outputSchema?: string;
}

export class PromptBuilder {
  build(layers: PromptLayers): string {
    return [
      layers.systemBase,
      layers.orgPolicy,
      layers.projectRules,
      layers.relevantSkills,
      layers.workflowHints,
      layers.sessionMemorySummary,
      layers.currentModePrompt,
      layers.currentStepPrompt,
      layers.contextBundle,
      layers.toolContracts,
      layers.outputSchema,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
}
