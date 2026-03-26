import { WorkspaceFs } from "../fs/workspace-fs.js";
import { PatchApplyError } from "@renews/core/index";

export interface PatchOperation {
  path: string;
  kind: "replace_range" | "replace_file" | "create_file" | "delete_file";
  startLine?: number;
  endLine?: number;
  oldText?: string;
  newText?: string;
}

export interface PatchApplyResult {
  applied: boolean;
  changedFiles: string[];
  summaries: string[];
}

const replaceRange = (
  content: string,
  startLine: number,
  endLine: number,
  newText: string,
): string => {
  const lines = content.split(/\r?\n/);
  const nextLines = [
    ...lines.slice(0, startLine - 1),
    ...newText.split(/\r?\n/),
    ...lines.slice(endLine),
  ];
  return nextLines.join("\n");
};

export class PatchService {
  constructor(private readonly fsService: WorkspaceFs) {}

  async apply(operations: PatchOperation[]): Promise<PatchApplyResult> {
    const changedFiles = new Set<string>();
    const summaries: string[] = [];

    for (const operation of operations) {
      if (operation.kind === "delete_file") {
        await this.fsService.delete(operation.path);
        changedFiles.add(operation.path);
        summaries.push(`Deleted ${operation.path}`);
        continue;
      }

      if (operation.kind === "create_file" || operation.kind === "replace_file") {
        await this.fsService.write(operation.path, operation.newText ?? "");
        changedFiles.add(operation.path);
        summaries.push(`${operation.kind === "create_file" ? "Created" : "Rewrote"} ${operation.path}`);
        continue;
      }

      if (operation.kind === "replace_range") {
        if (operation.startLine === undefined || operation.endLine === undefined) {
          throw new PatchApplyError(`replace_range requires startLine and endLine for ${operation.path}`);
        }
        const current = await this.fsService.read(operation.path);
        if (operation.oldText && !current.content.includes(operation.oldText)) {
          throw new PatchApplyError(`Old text mismatch for ${operation.path}`);
        }
        const next = replaceRange(
          current.content,
          operation.startLine,
          operation.endLine,
          operation.newText ?? "",
        );
        await this.fsService.write(operation.path, next);
        changedFiles.add(operation.path);
        summaries.push(`Updated ${operation.path}:${operation.startLine}-${operation.endLine}`);
      }
    }

    return {
      applied: true,
      changedFiles: [...changedFiles],
      summaries,
    };
  }
}
