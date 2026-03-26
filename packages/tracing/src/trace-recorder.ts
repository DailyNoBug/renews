import fs from "node:fs";
import path from "node:path";
import { nowIso } from "@renews/shared/index";

export interface TraceEvent {
  category: "user" | "debug" | "audit";
  event: string;
  payload: unknown;
  createdAt: string;
}

export class TraceRecorder {
  constructor(private readonly rootDir: string) {}

  record(category: TraceEvent["category"], event: string, payload: unknown): void {
    fs.mkdirSync(this.rootDir, { recursive: true });
    const line = JSON.stringify({
      category,
      event,
      payload,
      createdAt: nowIso(),
    });
    fs.appendFileSync(path.join(this.rootDir, `${category}.log`), `${line}\n`, "utf8");
  }
}
