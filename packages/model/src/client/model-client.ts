export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface ModelToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AssistantMessage {
  role: "assistant";
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

export interface ModelRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ModelToolSpec[];
  responseFormat?: "text" | "json";
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelResponse {
  message: AssistantMessage;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
}

export interface ModelEvent {
  type: "message_delta" | "tool_call" | "done" | "error";
  data: unknown;
}

export interface ModelClient {
  invoke(req: ModelRequest): Promise<ModelResponse>;
  stream(req: ModelRequest): AsyncIterable<ModelEvent>;
}
