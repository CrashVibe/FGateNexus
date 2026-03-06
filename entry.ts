import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { MigrationMeta } from "drizzle-orm/migrator";

import { configManager } from "./server/utils/config";

const MIGRATIONS_TABLE = "__drizzle_migrations";

const applyMigrations = (sqliteDb: Database, migrations: MigrationMeta[]) => {
  sqliteDb
    .query(
      `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at INTEGER)`,
    )
    .run();
  const lastMigration = sqliteDb
    .query<{ created_at: number }, []>(
      `SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`,
    )
    .get();
  const pending = migrations.filter(
    (m) => !lastMigration || lastMigration.created_at < m.folderMillis,
  );
  if (pending.length === 0) {
    return;
  }
  const insertStmt = sqliteDb.prepare(
    `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`,
  );
  sqliteDb.transaction(() => {
    for (const migration of pending) {
      for (const stmt of migration.sql) {
        sqliteDb.run(stmt);
      }
      insertStmt.run(migration.hash, migration.folderMillis);
    }
  })();
};

const execDir = path.dirname(path.resolve(process.execPath));
process.chdir(execDir);
console.info("工作目录在", process.cwd());

const initDatabase = async () => {
  const dbFilePath = path.resolve("./sqlite.db");
  const isNewDatabase = await fs
    .access(dbFilePath)
    .then(() => false)
    .catch(() => true);

  const client = new Database(dbFilePath);

  if (isNewDatabase) {
    console.info("数据库不存在，正在初始化...");
  } else {
    console.info("[MIGRATION] 检查并执行数据库迁移...");
  }

  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const { embeddedJournal, embeddedSqlFiles } =
      // @ts-expect-error - This module is generated during build
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      (await import("./.output/server/migrations/embedded.js")) as {
        embeddedJournal: {
          entries: { tag: string; when: number; breakpoints: boolean }[];
        };
        embeddedSqlFiles: Record<string, string>;
      };
    const migrations: MigrationMeta[] = embeddedJournal.entries.map((entry) => {
      const sql = embeddedSqlFiles[entry.tag];
      if (sql === undefined) {
        throw new Error(`未找到迁移 SQL 文件，tag: ${entry.tag}`);
      }
      return {
        bps: entry.breakpoints,
        folderMillis: entry.when,
        hash: createHash("sha256").update(sql).digest("hex"),
        sql: sql.split("--> statement-breakpoint"),
      };
    });
    applyMigrations(client, migrations);
    console.info("[SUCCESS] 数据库准备就绪");
  } catch (error) {
    console.error("数据库迁移失败：", error);
    process.exit(1);
  }
};

const startApplication = async () => {
  try {
    await initDatabase();
    const { config } = configManager;
    process.env.NITRO_HOST = config.nitro.host;
    process.env.NITRO_PORT = String(config.nitro.port);
    // @ts-expect-error - This module is generated during build
    await import("./.output/server/index.mjs");
  } catch (error) {
    console.error("应用启动失败：", error);
    process.exit(1);
  }
};

void startApplication();
