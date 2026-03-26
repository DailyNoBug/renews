import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { deepMerge } from "@renews/shared/index";
import { RenewsConfigSchema, defaultConfig, type RenewsConfig } from "./schema.js";

export interface LoadConfigOptions {
  cwd?: string;
  projectConfigPath?: string;
  userConfigPath?: string;
  cliOverrides?: Partial<RenewsConfig>;
  env?: NodeJS.ProcessEnv;
}

export interface LoadConfigResult {
  config: RenewsConfig;
  warnings: string[];
  sources: string[];
}

const expandEnvPlaceholders = (value: unknown, env: NodeJS.ProcessEnv): unknown => {
  if (typeof value === "string") {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => {
      const resolved = env[name];
      if (!resolved) {
        throw new Error(`Missing environment variable: ${name}`);
      }
      return resolved;
    });
  }

  if (Array.isArray(value)) {
    return value.map((entry) => expandEnvPlaceholders(entry, env));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, expandEnvPlaceholders(entry, env)]),
    );
  }

  return value;
};

const readYamlIfExists = (filePath: string): Record<string, unknown> | undefined => {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = YAML.parse(raw);
  return (parsed ?? {}) as Record<string, unknown>;
};

const configFromEnv = (env: NodeJS.ProcessEnv): Partial<RenewsConfig> => {
  const maybePort = env.RENEWS_SERVICE_PORT ? Number(env.RENEWS_SERVICE_PORT) : undefined;
  const envConfig: Partial<RenewsConfig> = {};

  if (env.RENEWS_WORKSPACE_ROOT || env.RENEWS_DEFAULT_MODE) {
    envConfig.project = {
      ...defaultConfig.project,
      ...(env.RENEWS_WORKSPACE_ROOT
        ? { workspaceRoot: env.RENEWS_WORKSPACE_ROOT }
        : {}),
      ...(env.RENEWS_DEFAULT_MODE
        ? { defaultMode: env.RENEWS_DEFAULT_MODE as "plan" | "act" }
        : {}),
    };
  }

  if (env.RENEWS_DB_PATH) {
    envConfig.storage = {
      ...defaultConfig.storage,
      dbPath: env.RENEWS_DB_PATH,
    };
  }

  if (env.RENEWS_SANDBOX_PROVIDER) {
    envConfig.sandbox = {
      ...defaultConfig.sandbox,
      provider: env.RENEWS_SANDBOX_PROVIDER as "docker" | "process",
    };
  }

  if (maybePort) {
    envConfig.service = {
      ...defaultConfig.service,
      port: maybePort,
    };
  }

  return envConfig;
};

const defaultProjectConfigPath = (cwd: string): string => path.join(cwd, "renews.config.yaml");
const defaultUserConfigPath = (): string => path.join(os.homedir(), ".renews", "config.yaml");

export const loadConfig = (options: LoadConfigOptions = {}): LoadConfigResult => {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const warnings: string[] = [];
  const sources: string[] = [];

  const projectPath = options.projectConfigPath ?? defaultProjectConfigPath(cwd);
  const userPath = options.userConfigPath ?? defaultUserConfigPath();

  const userConfig = readYamlIfExists(userPath);
  if (userConfig) {
    sources.push(userPath);
  }

  const projectConfig = readYamlIfExists(projectPath);
  if (projectConfig) {
    sources.push(projectPath);
  }

  const merged = deepMerge<RenewsConfig>(
    defaultConfig,
    userConfig as Partial<RenewsConfig> | undefined,
    projectConfig as Partial<RenewsConfig> | undefined,
    configFromEnv(env),
    options.cliOverrides,
  );

  const expanded = expandEnvPlaceholders(merged, env);
  const parsed = RenewsConfigSchema.safeParse(expanded);

  if (!parsed.success) {
    throw new Error(`Invalid renews config: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }

  const config = parsed.data;

  if (!config.models.planner.apiKeyEnv || !env[config.models.planner.apiKeyEnv]) {
    warnings.push(
      `Missing planner API key environment variable: ${config.models.planner.apiKeyEnv}`,
    );
  }

  if (!config.search.apiKeyEnv || !env[config.search.apiKeyEnv]) {
    warnings.push(`Missing search API key environment variable: ${config.search.apiKeyEnv}`);
  }

  return {
    config,
    warnings,
    sources,
  };
};
