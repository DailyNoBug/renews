import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PROTECTED_PATHS, isSubPath, normalizeWorkspacePath } from "@renews/shared/index";
import { ToolExecutionError } from "@renews/core/index";

export interface FileReadResult {
  path: string;
  content: string;
  truncated: boolean;
  startLine?: number;
  endLine?: number;
}

export interface FileStatResult {
  path: string;
  exists: boolean;
  isDirectory?: boolean;
  size?: number;
  modifiedAt?: string;
}

export class WorkspaceFs {
  constructor(private readonly workspaceRoot: string) {}

  resolve(targetPath: string): string {
    return normalizeWorkspacePath(this.workspaceRoot, targetPath);
  }

  private ensureInsideWorkspace(targetPath: string): string {
    const resolved = this.resolve(targetPath);
    if (!isSubPath(this.workspaceRoot, resolved)) {
      throw new ToolExecutionError(`Path outside workspace: ${resolved}`);
    }
    return resolved;
  }

  private ensureNotProtected(targetPath: string): void {
    const normalized = targetPath.replaceAll("\\", "/");
    if (DEFAULT_PROTECTED_PATHS.some((protectedPath) => normalized === protectedPath || normalized.startsWith(`${protectedPath}/`))) {
      throw new ToolExecutionError(`Protected path cannot be modified: ${targetPath}`);
    }
  }

  async read(targetPath: string, startLine?: number, endLine?: number): Promise<FileReadResult> {
    const resolved = this.ensureInsideWorkspace(targetPath);
    const content = await fs.readFile(resolved, "utf8");
    if (startLine === undefined || endLine === undefined) {
      return {
        path: resolved,
        content,
        truncated: false,
      };
    }

    const lines = content.split(/\r?\n/);
    const slice = lines.slice(startLine - 1, endLine);
    return {
      path: resolved,
      content: slice.join("\n"),
      truncated: slice.length !== lines.length,
      startLine,
      endLine,
    };
  }

  async write(targetPath: string, content: string): Promise<void> {
    this.ensureNotProtected(targetPath);
    const resolved = this.ensureInsideWorkspace(targetPath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf8");
  }

  async append(targetPath: string, content: string): Promise<void> {
    this.ensureNotProtected(targetPath);
    const resolved = this.ensureInsideWorkspace(targetPath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.appendFile(resolved, content, "utf8");
  }

  async delete(targetPath: string): Promise<void> {
    this.ensureNotProtected(targetPath);
    const resolved = this.ensureInsideWorkspace(targetPath);
    await fs.rm(resolved, { recursive: true, force: true });
  }

  async list(targetPath = "."): Promise<string[]> {
    const resolved = this.ensureInsideWorkspace(targetPath);
    const results: string[] = [];

    const walk = async (currentPath: string): Promise<void> => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(this.workspaceRoot, entryPath);
        if (DEFAULT_PROTECTED_PATHS.some((candidate) => relativePath === candidate || relativePath.startsWith(`${candidate}/`))) {
          continue;
        }
        results.push(relativePath);
        if (entry.isDirectory()) {
          await walk(entryPath);
        }
      }
    };

    await walk(resolved);
    return results.sort();
  }

  async stat(targetPath: string): Promise<FileStatResult> {
    const resolved = this.ensureInsideWorkspace(targetPath);
    try {
      const stat = await fs.stat(resolved);
      return {
        path: resolved,
        exists: true,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    } catch {
      return {
        path: resolved,
        exists: false,
      };
    }
  }
}
