import path from "node:path";
import { WorkspaceFs } from "../fs/workspace-fs.js";

export interface RepoTreeNode {
  path: string;
  kind: "file" | "directory";
}

export class RepoTreeBuilder {
  constructor(private readonly fsService: WorkspaceFs) {}

  async build(root = "."): Promise<RepoTreeNode[]> {
    const files = await this.fsService.list(root);
    return files.map((entry) => ({
      path: entry,
      kind: path.extname(entry) ? "file" : "directory",
    }));
  }
}
