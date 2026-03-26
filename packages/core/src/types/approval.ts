export type ApprovalAction =
  | "write_file"
  | "delete_file"
  | "run_command"
  | "install_dependency"
  | "git_commit"
  | "network_request"
  | "use_remote_search";

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  action: ApprovalAction;
  payload: Record<string, unknown>;
  risk: "low" | "medium" | "high";
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
}
