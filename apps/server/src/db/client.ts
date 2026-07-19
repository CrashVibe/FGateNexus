import { Database } from "bun:sqlite";
import path from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

const DB_PATH = path.join("data", "sqlite.db");

const sqlite = new Database(DB_PATH);
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA synchronous = NORMAL;");
sqlite.run("PRAGMA foreign_keys = ON;");
sqlite.run("PRAGMA busy_timeout = 5000;");
sqlite.run("PRAGMA cache_size = -64000;");
sqlite.run("PRAGMA temp_store = MEMORY;");

export const db = drizzle(sqlite, { schema });
