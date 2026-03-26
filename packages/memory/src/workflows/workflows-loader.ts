import fs from "node:fs/promises";
import type { WorkflowHint } from "@renews/core/index";
import YAML from "yaml";

export class WorkflowsLoader {
  async load(pathsToScan: string[], goal: string): Promise<WorkflowHint[]> {
    const hints: WorkflowHint[] = [];
    for (const file of pathsToScan) {
      try {
        const files = await fs.readdir(file);
        for (const entry of files) {
          if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) {
            continue;
          }
          const fullPath = `${file}/${entry}`;
          const raw = await fs.readFile(fullPath, "utf8");
          const parsed = YAML.parse(raw) as Record<string, any>;
          const patterns = parsed.match?.any ?? [];
          const matched = patterns.find((pattern: string) => goal.includes(pattern));
          if (!matched) {
            continue;
          }
          hints.push({
            name: parsed.name ?? entry,
            steps: parsed.steps ?? [],
            matchedBy: matched,
            path: fullPath,
          });
        }
      } catch {
        continue;
      }
    }
    return hints;
  }
}
