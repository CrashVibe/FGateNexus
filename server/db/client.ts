import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

type DatabaseInstance =
  | BetterSQLite3Database<typeof schema>
  | BunSQLiteDatabase<typeof schema>;

const createDatabaseInstance = async (): Promise<DatabaseInstance> => {
  if (typeof Bun !== "undefined") {
    const { Database } = await import("bun:sqlite");
    const { drizzle } = await import("drizzle-orm/bun-sqlite");

    const sqlite = new Database("sqlite.db");
    sqlite.run("PRAGMA journal_mode = WAL;");
    sqlite.run("PRAGMA synchronous = NORMAL;");
    sqlite.run("PRAGMA foreign_keys = ON;");
    sqlite.run("PRAGMA busy_timeout = 5000;");
    sqlite.run("PRAGMA cache_size = -64000;");
    sqlite.run("PRAGMA temp_store = MEMORY;");
    return drizzle(sqlite, { schema });
  }
  const betterSqlite3Module = await import("better-sqlite3");
  const Database = betterSqlite3Module.default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");

  const sqlite = new Database("sqlite.db");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("cache_size = -64000");
  sqlite.pragma("temp_store = MEMORY");
  return drizzle(sqlite, { schema });
};

export const db: DatabaseInstance = await createDatabaseInstance();
