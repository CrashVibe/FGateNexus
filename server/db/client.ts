import * as schema from "./schema";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

type DatabaseInstance = BetterSQLite3Database<typeof schema> | BunSQLiteDatabase<typeof schema>;

let _db: DatabaseInstance | null = null;

async function createDatabaseInstance(): Promise<DatabaseInstance> {
    if (typeof Bun !== "undefined") {
        const { Database } = await import("bun:sqlite");
        const { drizzle } = await import("drizzle-orm/bun-sqlite");

        const sqlite = new Database("sqlite.db");
        return drizzle(sqlite, { schema });
    } else {
        const Database = (await import("better-sqlite3")).default;
        const { drizzle } = await import("drizzle-orm/better-sqlite3");

        const sqlite = new Database("sqlite.db");
        return drizzle(sqlite, { schema });
    }
}

async function getDatabase(): Promise<DatabaseInstance> {
    if (!_db) {
        _db = await createDatabaseInstance();
    }
    return _db;
}

export { getDatabase };
