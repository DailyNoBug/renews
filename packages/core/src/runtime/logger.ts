import pino, { type Logger as PinoLogger } from "pino";

export type Logger = PinoLogger;

export const createLogger = (level = process.env.RENEWS_LOG_LEVEL ?? "info"): Logger =>
  pino({
    level,
    redact: [
      "*.apiKey",
      "*.api_key",
      "*.authorization",
      "*.Authorization",
      "*.token",
      "*.MODEL_GATEWAY_KEY",
      "*.SEARCH_API_KEY",
    ],
  });
