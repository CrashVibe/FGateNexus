import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

async function createDatabaseInstance(): Promise<BunSQLiteDatabase<typeof schema>> {
  const sqlite = new Database("sqlite.db");
  sqlite.run("PRAGMA journal_mode = WAL;");
  sqlite.run("PRAGMA synchronous = NORMAL;");
  return drizzle(sqlite, { schema });
}

export const db = await createDatabaseInstance();
