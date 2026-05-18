import path from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const DB_DIR = "data";
const DB_PATH = path.join(DB_DIR, "sqlite.db");

const db = drizzle(DB_PATH);

migrate(db, { migrationsFolder: "./migrations" });

console.info("Migrations applied successfully.");
