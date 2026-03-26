import { ModelInvocationError } from "@renews/core/index";
import type {
  AssistantMessage,
  ChatMessage,
  ModelClient,
  ModelEvent,
  ModelRequest,
  ModelResponse,
} from "../client/model-client.js";

export interface OpenAICompatibleModelClientOptions {
  baseURL: string;
  apiKey: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const buildBody = (req: ModelRequest, stream: boolean): Record<string, unknown> => ({
  model: req.model,
  messages: req.messages.map((message) => ({
    role: message.role,
    content: message.content,
    name: message.name,
  })),
  tools: req.tools?.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  })),
  response_format: req.responseFormat === "json" ? { type: "json_object" } : undefined,
  max_tokens: req.maxOutputTokens,
  temperature: req.temperature,
  stream,
  metadata: req.metadata,
});

const parseResponse = (payload: Record<string, any>): ModelResponse => {
  const choice = payload.choices?.[0];
  const toolCalls = choice?.message?.tool_calls?.map((toolCall: any) => ({
    name: toolCall.function.name,
    arguments: JSON.parse(toolCall.function.arguments ?? "{}"),
  }));
  const message: AssistantMessage = {
    role: "assistant",
    content: choice?.message?.content ?? "",
    toolCalls,
  };
  return {
    message,
    usage: payload.usage
      ? {
          inputTokens: payload.usage.prompt_tokens,
          outputTokens: payload.usage.completion_tokens,
          totalTokens: payload.usage.total_tokens,
        }
      : undefined,
    finishReason: choice?.finish_reason,
  };
};

export class OpenAICompatibleModelClient implements ModelClient {
  constructor(private readonly options: OpenAICompatibleModelClientOptions) {}

  private async fetchWithRetry(req: ModelRequest, stream: boolean): Promise<Response> {
    const maxRetries = this.options.maxRetries ?? 3;
    const controller = new AbortController();
    const timer =
      this.options.timeoutMs && this.options.timeoutMs > 0
        ? setTimeout(() => controller.abort(), this.options.timeoutMs)
        : undefined;

    try {
      for (let attempt = 0; attempt < maxRetries; attempt += 1) {
        const response = await fetch(new URL("/chat/completions", this.options.baseURL), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.options.apiKey}`,
            ...this.options.defaultHeaders,
          },
          body: JSON.stringify(buildBody(req, stream)),
          signal: controller.signal,
        });

        if (response.ok) {
          return response;
        }

        if (response.status === 429 || response.status >= 500) {
          await sleep(250 * 2 ** attempt);
          continue;
        }

        throw new ModelInvocationError(`Model request failed with status ${response.status}`, false, {
          status: response.status,
          body: await response.text(),
        });
      }

      throw new ModelInvocationError("Model request exceeded retry limit");
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async invoke(req: ModelRequest): Promise<ModelResponse> {
    const response = await this.fetchWithRetry(req, false);
    const payload = (await response.json()) as Record<string, any>;
    return parseResponse(payload);
  }

  async *stream(req: ModelRequest): AsyncIterable<ModelEvent> {
    const response = await this.fetchWithRetry(req, true);
    const reader = response.body?.getReader();
    if (!reader) {
      throw new ModelInvocationError("Streaming response did not include a readable body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const line = chunk
          .split("\n")
          .find((entry) => entry.startsWith("data: "));
        if (!line) {
          continue;
        }
        const json = line.slice("data: ".length);
        if (json === "[DONE]") {
          yield {
            type: "done",
            data: undefined,
          };
          continue;
        }
        const payload = JSON.parse(json) as Record<string, any>;
        const delta = payload.choices?.[0]?.delta;
        if (delta?.content) {
          yield {
            type: "message_delta",
            data: delta.content,
          };
        }
        if (delta?.tool_calls?.length) {
          yield {
            type: "tool_call",
            data: delta.tool_calls,
          };
        }
      }
    }
  }
}
