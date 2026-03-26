import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export class SqliteClient {
  readonly db: Database.Database;

  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma("foreign_keys = ON");
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }
}
