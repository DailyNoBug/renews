import type { Database as BetterSqliteDatabase, Statement } from "better-sqlite3";

export abstract class BaseRepository {
  protected readonly db: BetterSqliteDatabase;

  constructor(db: BetterSqliteDatabase) {
    this.db = db;
  }

  protected prepare(sql: string): Statement {
    return this.db.prepare(sql);
  }
}
