import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

type DatabaseInstance = BetterSQLite3Database<typeof schema> | BunSQLiteDatabase<typeof schema>;

let db: DatabaseInstance | null = null;

async function createDatabaseInstance(): Promise<DatabaseInstance> {
  if (typeof Bun !== "undefined") {
    const { Database } = await import("bun:sqlite");
    const { drizzle } = await import("drizzle-orm/bun-sqlite");

    const sqlite = new Database("sqlite.db");
    sqlite.run("PRAGMA journal_mode = WAL;");
    sqlite.run("PRAGMA synchronous = NORMAL;");
    return drizzle(sqlite, { schema });
  } else {
    const Database = (await import("better-sqlite3")).default;
    const { drizzle } = await import("drizzle-orm/better-sqlite3");

    const sqlite = new Database("sqlite.db");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
    return drizzle(sqlite, { schema });
  }
}

async function getDatabase(): Promise<DatabaseInstance> {
  if (!db) {
    db = await createDatabaseInstance();
  }
  return db;
}

export { getDatabase };
