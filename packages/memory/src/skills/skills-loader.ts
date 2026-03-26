import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { SkillDoc } from "@renews/core/index";

const parseSkill = (content: string): { meta: Record<string, any>; body: string } => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content };
  }
  return {
    meta: (YAML.parse(match[1]) ?? {}) as Record<string, any>,
    body: match[2].trim(),
  };
};

const walkSkills = async (root: string): Promise<string[]> => {
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

export class SkillsLoader {
  async load(pathsToScan: string[]): Promise<SkillDoc[]> {
    const docs: SkillDoc[] = [];
    for (const basePath of pathsToScan) {
      try {
        const files = await walkSkills(basePath);
        for (const file of files) {
          const raw = await fs.readFile(file, "utf8");
          const { meta, body } = parseSkill(raw);
          docs.push({
            name: meta.name ?? path.basename(file, ".md"),
            triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
            body,
            path: file,
          });
        }
      } catch {
        continue;
      }
    }
    return docs;
  }
}
