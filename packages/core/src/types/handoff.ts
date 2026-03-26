import type { JsonSchema } from "@renews/shared/index";

export type AgentRole =
  | "supervisor"
  | "planner"
  | "architect"
  | "editor"
  | "reviewer"
  | "tester"
  | "searcher";

export interface AgentHandoff<I, O> {
  from: AgentRole;
  to: AgentRole;
  reason: string;
  input: I;
  outputSchema: JsonSchema;
  output?: O;
}
