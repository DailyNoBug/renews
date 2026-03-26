import { z } from "zod";
import { IdentifierSchema, StringArraySchema, TimestampSchema, jsonSchemaFromZod } from "./common.js";

export const PlanStepSchema = z.object({
  id: IdentifierSchema,
  title: z.string().min(1),
  goal: z.string().min(1),
  editablePaths: StringArraySchema.optional(),
  validationTargets: StringArraySchema.optional(),
  toolIntents: StringArraySchema,
  dependsOn: StringArraySchema.optional(),
  status: z.enum(["todo", "doing", "done", "failed", "skipped"]).default("todo"),
});

export const PlannerOutputStepSchema = PlanStepSchema.omit({
  id: true,
  status: true,
});

export const ExecutionPlanSchema = z.object({
  id: IdentifierSchema,
  sessionId: IdentifierSchema,
  summary: z.string().min(1),
  assumptions: StringArraySchema,
  risks: StringArraySchema,
  requiresApproval: z.boolean(),
  steps: z.array(PlanStepSchema),
  createdAt: TimestampSchema,
});

export const PlannerOutputSchema = z.object({
  summary: z.string().min(1),
  assumptions: StringArraySchema,
  risks: StringArraySchema,
  requiresApproval: z.boolean(),
  steps: z.array(PlannerOutputStepSchema),
});

export type PlannerOutputShape = z.infer<typeof PlannerOutputSchema>;
export const PlannerOutputJsonSchema = jsonSchemaFromZod(PlannerOutputSchema, "PlannerOutput");
