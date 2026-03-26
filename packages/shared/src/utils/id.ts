import { createHash, randomUUID } from "node:crypto";

export const createId = (prefix?: string): string =>
  prefix ? `${prefix}_${randomUUID()}` : randomUUID();

export const hashContent = (content: string | Buffer): string =>
  createHash("sha256").update(content).digest("hex");
