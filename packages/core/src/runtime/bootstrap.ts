import path from "node:path";
import { loadConfig, type LoadConfigOptions, type RenewsConfig } from "@renews/config/index";
import { OpenAICompatibleModelClient, PromptBuilder, StructuredOutputParser } from "@renews/model/index";
import { DockerSandbox, ProcessSandbox, type Sandbox } from "@renews/sandbox/index";
import { StorageFacade } from "@renews/storage/index";
import { ArchitectAgent, ContextEngine, EditorAgent, PlannerAgent, ReviewerAgent, SupervisorAgent, TesterAgent } from "@renews/agents/index";
import { ApprovalService } from "../approvals/approval-service.js";
import { CheckpointService } from "../checkpoints/checkpoint-service.js";
import { EventBus } from "../events/event-bus.js";
import { Runtime } from "./runtime.js";

export interface BootstrapOptions extends LoadConfigOptions {
  workspaceRoot?: string;
}

export interface SupervisorSystem {
  config: RenewsConfig;
  storage: StorageFacade;
  sandbox: Sandbox;
  runtime: Runtime;
  supervisor: SupervisorAgent;
  approvals: ApprovalService;
  checkpoints: CheckpointService;
  eventBus: EventBus;
}

const createParser = (
  config:
    | {
        baseURL: string;
        apiKeyEnv: string;
        model: string;
      }
    | undefined,
): { parser?: StructuredOutputParser; modelName?: string } => {
  if (!config) {
    return {};
  }
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    return {};
  }
  const client = new OpenAICompatibleModelClient({
    baseURL: config.baseURL,
    apiKey,
    timeoutMs: 120_000,
    maxRetries: 3,
  });
  return {
    parser: new StructuredOutputParser(client),
    modelName: config.model,
  };
};

const createSandbox = (config: RenewsConfig, workspaceRoot: string): Sandbox => {
  const options = {
    workspaceRoot,
    writablePaths: config.sandbox.writablePaths,
    blockedCommands: config.sandbox.blockedCommands,
    network: config.sandbox.network,
    dockerImage: config.sandbox.image,
  } as const;
  return config.sandbox.provider === "docker" ? new DockerSandbox(options) : new ProcessSandbox(options);
};

export const bootstrapSupervisorSystem = (options: BootstrapOptions = {}): SupervisorSystem => {
  const loaded = loadConfig(options);
  const config: RenewsConfig = {
    ...loaded.config,
    project: {
      ...loaded.config.project,
      workspaceRoot: options.workspaceRoot
        ? path.resolve(options.workspaceRoot)
        : path.resolve(loaded.config.project.workspaceRoot),
    },
  };

  const storage = new StorageFacade({
    dbPath: path.resolve(config.project.workspaceRoot, config.storage.dbPath),
  });
  const eventBus = new EventBus();
  const approvals = new ApprovalService(storage, eventBus, config.approvals);
  const checkpoints = new CheckpointService(storage, eventBus, {
    workspaceRoot: config.project.workspaceRoot,
  });
  const runtime = new Runtime(config, {
    storage,
    approvals,
    checkpoints,
    eventBus,
  });
  const sandbox = createSandbox(config, config.project.workspaceRoot);
  const contextEngine = new ContextEngine({
    config,
    storage,
  });
  const promptBuilder = new PromptBuilder();
  const plannerModel = createParser(config.models.planner);
  const architectModel = createParser(config.models.executor);
  const editorModel = createParser(config.models.editor);
  const reviewerModel = createParser(config.models.reviewer);

  const planner = new PlannerAgent(plannerModel.parser, promptBuilder, plannerModel.modelName);
  const architect = new ArchitectAgent(architectModel.parser, promptBuilder, architectModel.modelName);
  const editor = new EditorAgent(
    config.project.workspaceRoot,
    approvals,
    editorModel.parser,
    promptBuilder,
    editorModel.modelName,
  );
  const tester = new TesterAgent(sandbox, storage.validations, approvals);
  const reviewer = new ReviewerAgent(
    reviewerModel.parser,
    promptBuilder,
    reviewerModel.modelName,
  );
  const supervisor = new SupervisorAgent({
    runtime,
    config,
    contextEngine,
    planner,
    architect,
    editor,
    tester,
    reviewer,
  });

  return {
    config,
    storage,
    sandbox,
    runtime,
    supervisor,
    approvals,
    checkpoints,
    eventBus,
  };
};
