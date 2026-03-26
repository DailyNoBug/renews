import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export type JsonSchema = Record<string, unknown>;

export const TimestampSchema = z.string().datetime();

export const IdentifierSchema = z.string().min(1);

export const StringArraySchema = z.array(z.string());

export const JsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonSchemaFromZod = (schema: z.ZodTypeAny, name: string): JsonSchema =>
  zodToJsonSchema(schema, name) as JsonSchema;

export const EmptyObjectSchema = z.object({}).strict();
