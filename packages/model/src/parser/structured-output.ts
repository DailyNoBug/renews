import { z } from "zod";
import { ModelInvocationError } from "@renews/core/index";
import type { ModelClient, ModelRequest } from "../client/model-client.js";

const extractJsonObject = (content: string): string => {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new ModelInvocationError("Model response did not contain JSON");
  }
  return match[0];
};

export class StructuredOutputParser {
  constructor(private readonly client: ModelClient, private readonly maxRetries = 3) {}

  async parse<T extends z.ZodTypeAny>(request: ModelRequest, schema: T): Promise<z.infer<T>> {
    for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
      const response = await this.client.invoke({
        ...request,
        responseFormat: "json",
      });
      try {
        const parsed = JSON.parse(extractJsonObject(response.message.content));
        return schema.parse(parsed);
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          throw new ModelInvocationError("Failed to parse structured model output", true, error);
        }
      }
    }

    throw new ModelInvocationError("Structured parsing exhausted retries");
  }
}
