import { loadConfig } from "@renews/config/index";
import { OpenAICompatibleModelClient, StructuredOutputParser } from "@renews/model/index";
import { z } from "zod";

const parseArgs = (args: string[]): { role: "planner" | "executor" | "editor" | "reviewer"; message: string } => {
  let role: "planner" | "executor" | "editor" | "reviewer" = "planner";
  const messageParts: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const part = args[index];
    if (part === "--role" && args[index + 1]) {
      role = args[index + 1] as typeof role;
      index += 1;
      continue;
    }
    messageParts.push(part);
  }

  return {
    role,
    message: messageParts.join(" ").trim() || "请输出 JSON：{\"ok\":true,\"message\":\"gateway works\"}",
  };
};

const main = async (): Promise<void> => {
  const { role, message } = parseArgs(process.argv.slice(2));
  const { config } = loadConfig({
    cwd: process.cwd(),
  });
  const roleConfig = config.models[role];
  if (!roleConfig) {
    throw new Error(`Unknown model role: ${role}`);
  }
  const apiKey = process.env[roleConfig.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing API key env: ${roleConfig.apiKeyEnv}`);
  }

  const client = new OpenAICompatibleModelClient({
    baseURL: roleConfig.baseURL,
    apiKey,
    timeoutMs: 60_000,
    maxRetries: 3,
  });
  const parser = new StructuredOutputParser(client);
  const result = await parser.parse(
    {
      model: roleConfig.model,
      messages: [
        {
          role: "system",
          content:
            "You are a smoke-test assistant. Reply with valid JSON matching the provided schema.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      maxOutputTokens: roleConfig.maxOutputTokens,
      temperature: roleConfig.temperature,
    },
    z.object({
      ok: z.boolean(),
      message: z.string(),
    }),
  );

  console.log(JSON.stringify({ role, result }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
