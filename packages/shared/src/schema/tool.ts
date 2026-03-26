import { z } from "zod";
import { IdentifierSchema, jsonSchemaFromZod } from "./common.js";

export const PermissionModeSchema = z.enum(["allow", "ask", "deny"]);
export type PermissionMode = z.infer<typeof PermissionModeSchema>;

export const ToolPermissionSchema = z.object({
  mode: PermissionModeSchema,
  action: z.string().optional(),
  risk: z.enum(["low", "medium", "high"]).default("low"),
});

export const ToolDefinitionSchema = z.object({
  name: IdentifierSchema,
  description: z.string().min(1),
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
  permission: ToolPermissionSchema,
  timeoutMs: z.number().int().positive().default(30_000),
  idempotent: z.boolean().default(false),
});

export type ToolPermission = z.infer<typeof ToolPermissionSchema>;
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ToolDefinitionJsonSchema = jsonSchemaFromZod(ToolDefinitionSchema, "ToolDefinition");
