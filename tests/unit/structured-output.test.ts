import { describe, expect, it } from "vitest";
import { z } from "zod";
import { StructuredOutputParser, type ModelClient, type ModelEvent, type ModelRequest, type ModelResponse } from "@renews/model/index";

class FakeModelClient implements ModelClient {
  async invoke(_req: ModelRequest): Promise<ModelResponse> {
    return {
      message: {
        role: "assistant",
        content: JSON.stringify({ ok: true }),
      },
    };
  }

  async *stream(_req: ModelRequest): AsyncIterable<ModelEvent> {
    yield { type: "done", data: undefined };
  }
}

describe("StructuredOutputParser", () => {
  it("parses valid JSON responses", async () => {
    const parser = new StructuredOutputParser(new FakeModelClient());
    const result = await parser.parse(
      {
        model: "fake",
        messages: [],
      },
      z.object({
        ok: z.boolean(),
      }),
    );
    expect(result.ok).toBe(true);
  });
});
