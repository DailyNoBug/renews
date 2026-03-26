import path from "node:path";
import type { ContextBundle, ValidationContext } from "@renews/core/index";
import type { RenewsConfig } from "@renews/config/index";
import { HybridRetriever, RepoMapBuilder, SymbolIndexer, TreeSitterManager } from "@renews/context/index";
import { MemorySummarizer, ProjectMemoryStore, RulesLoader, SessionMemoryStore, SkillsLoader, WorkflowsLoader } from "@renews/memory/index";
import type { StorageFacade } from "@renews/storage/index";

export interface ContextEngineOptions {
  config: RenewsConfig;
  storage: StorageFacade;
}

export class ContextEngine {
  private readonly treeSitter = new TreeSitterManager();
  private readonly symbolIndexer = new SymbolIndexer(this.treeSitter);
  private readonly repoMapBuilder = new RepoMapBuilder(this.treeSitter);
  private readonly rulesLoader = new RulesLoader();
  private readonly skillsLoader = new SkillsLoader();
  private readonly workflowsLoader = new WorkflowsLoader();
  private readonly sessionMemory: SessionMemoryStore;
  private readonly projectMemory: ProjectMemoryStore;
  private readonly summarizer = new MemorySummarizer();

  constructor(private readonly options: ContextEngineOptions) {
    this.sessionMemory = new SessionMemoryStore(options.storage);
    this.projectMemory = new ProjectMemoryStore(options.storage);
  }

  async build(params: {
    sessionId: string;
    taskSummary: string;
    workspaceRoot: string;
    activeFiles?: string[];
    recentFiles?: string[];
    validationContext?: ValidationContext;
  }): Promise<ContextBundle> {
    const repoMap = await this.repoMapBuilder.build(
      params.workspaceRoot,
      this.options.config.context.repoMap.maxSymbols,
    );
    const retriever = new HybridRetriever(params.workspaceRoot, this.symbolIndexer);
    const retrievalHits = await retriever.retrieve({
      task: params.taskSummary,
      workspaceRoot: params.workspaceRoot,
      topK: this.options.config.context.retrieval.topK,
      activeFiles: params.activeFiles,
      recentFiles: params.recentFiles,
      validationFailureSummary: params.validationContext?.latestFailureSummary,
    });
    const symbolHits = retrievalHits
      .flatMap((hit) => hit.snippets.map((snippet) => snippet.path))
      .slice(0, 10);
    const absoluteSymbolPaths = symbolHits.map((file) => path.join(params.workspaceRoot, file));
    const symbolEntries = await this.symbolIndexer.lookupByName(absoluteSymbolPaths, params.taskSummary).catch(() => []);
    const sessionSummary = this.summarizer.summarize(this.sessionMemory.list(params.sessionId));
    const projectSummary = this.summarizer.summarize(this.projectMemory.list());
    const rules = await this.rulesLoader.load(
      this.options.config.rules.paths.map((entry) => path.join(params.workspaceRoot, entry)),
    );
    const skills = await this.skillsLoader.load(
      this.options.config.skills.paths.map((entry) => path.join(params.workspaceRoot, entry)),
    );
    const workflowHints = await this.workflowsLoader.load(
      this.options.config.workflows.paths.map((entry) => path.join(params.workspaceRoot, entry)),
      params.taskSummary,
    );

    return {
      taskSummary: params.taskSummary,
      activeFiles: retrievalHits.flatMap((hit) => hit.snippets).slice(0, 8),
      repoMap,
      symbolHits: symbolEntries.map((entry) => ({
        symbolId: entry.id,
        filePath: entry.filePath,
        name: entry.name,
        reason: `matched ${params.taskSummary}`,
        score: 1,
      })),
      retrievalHits,
      recentHistorySummary: [sessionSummary, projectSummary].filter(Boolean).join("\n"),
      rules,
      skills,
      workflowHints,
      validationContext: params.validationContext,
    };
  }

  rememberSession(sessionId: string, key: string, value: unknown): void {
    this.sessionMemory.set(sessionId, key, value);
  }

  rememberProject(key: string, value: unknown): void {
    this.projectMemory.set(key, value);
  }
}
