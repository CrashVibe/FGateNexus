import { Database } from "bun:sqlite";

import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

const createDatabaseInstance = (): BunSQLiteDatabase<typeof schema> => {
  const sqlite = new Database("sqlite.db");
  sqlite.run("PRAGMA journal_mode = WAL;");
  sqlite.run("PRAGMA synchronous = NORMAL;");
  sqlite.run("PRAGMA foreign_keys = ON;");
  sqlite.run("PRAGMA busy_timeout = 5000;");
  sqlite.run("PRAGMA cache_size = -64000;");
  sqlite.run("PRAGMA temp_store = MEMORY;");
  return drizzle(sqlite, { schema });
};

export const db = createDatabaseInstance();
