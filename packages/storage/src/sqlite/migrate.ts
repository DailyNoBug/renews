import fs from "node:fs";
import path from "node:path";
import { SqliteClient } from "./client.js";

export const runMigrations = (client: SqliteClient, migrationsDir: string): void => {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    client.exec(sql);
  }
};
