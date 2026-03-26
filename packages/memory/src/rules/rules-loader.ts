import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { RuleDoc } from "@renews/core/index";

const parseFrontmatter = (content: string): { meta: Record<string, any>; body: string } => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content };
  }
  const meta = (YAML.parse(match[1]) ?? {}) as Record<string, any>;
  return {
    meta,
    body: match[2],
  };
};

const walkMarkdown = async (root: string): Promise<string[]> => {
  const files: string[] = [];
  const visit = async (currentPath: string): Promise<void> => {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  };
  await visit(root);
  return files;
};

export class RulesLoader {
  async load(pathsToScan: string[]): Promise<RuleDoc[]> {
    const docs: RuleDoc[] = [];
    for (const basePath of pathsToScan) {
      try {
        const files = await walkMarkdown(basePath);
        for (const file of files) {
          const raw = await fs.readFile(file, "utf8");
          const { meta, body } = parseFrontmatter(raw);
          docs.push({
            name: meta.name ?? path.basename(file, ".md"),
            priority: Number(meta.priority ?? 50),
            appliesTo: Array.isArray(meta.appliesTo) ? meta.appliesTo : [meta.appliesTo ?? "**/*"],
            body: body.trim(),
            path: file,
          });
        }
      } catch {
        continue;
      }
    }
    return docs.sort((left, right) => right.priority - left.priority);
  }
}
