export interface FileSnippet {
  path: string;
  content: string;
  startLine?: number;
  endLine?: number;
  score?: number;
}

export interface SymbolHit {
  symbolId: string;
  filePath: string;
  name: string;
  reason: string;
  score: number;
}

export interface ValidationContext {
  latestFailureSummary?: string;
  commands?: string[];
}

export interface RuleDoc {
  name: string;
  priority: number;
  appliesTo: string[];
  body: string;
  path: string;
}

export interface SkillDoc {
  name: string;
  triggers: string[];
  body: string;
  path: string;
}

export interface WorkflowHint {
  name: string;
  steps: string[];
  matchedBy: string;
  path: string;
}

export interface RetrievalHit {
  filePath: string;
  reason: string;
  score: number;
  snippets: FileSnippet[];
}

export interface RepoMapFile {
  path: string;
  summary: string;
  symbols: Array<{
    name: string;
    kind: string;
    signature?: string;
    exported?: boolean;
  }>;
}

export interface RepoMap {
  generatedAt: string;
  files: RepoMapFile[];
}

export interface ContextBundle {
  taskSummary: string;
  activeFiles: FileSnippet[];
  repoMap: RepoMap;
  symbolHits: SymbolHit[];
  retrievalHits: RetrievalHit[];
  recentHistorySummary: string;
  rules: RuleDoc[];
  skills: SkillDoc[];
  workflowHints: WorkflowHint[];
  validationContext?: ValidationContext;
}
