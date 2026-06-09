import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { MigrationMeta } from "drizzle-orm/migrator";

import { logger } from "#server/utils/logger";

const DB_DIR = "data";
const DB_PATH = path.join(DB_DIR, "sqlite.db");
const LEGACY_PATH = "sqlite.db";
const MIGRATIONS_DIR = "migrations";

const exists = async (p: string): Promise<boolean> => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

/**
 * 准备数据库目录，并把历史遗留在根目录的 sqlite.db 迁到 data/ 下。
 * 必须在任何模块打开数据库（`#server/db/client`）之前调用。
 */
export const prepareDatabase = async (): Promise<void> => {
  await fs.mkdir(DB_DIR, { recursive: true });

  const [legacyExists, newExists] = await Promise.all([
    exists(LEGACY_PATH),
    exists(DB_PATH),
  ]);

  if (legacyExists && newExists) {
    logger.warn(
      `检测到根目录和 ${DB_DIR} 目录下同时存在数据库，将继续使用 ${DB_PATH}。如有需要，请手动将 ${LEGACY_PATH} 覆盖到 ${DB_PATH}，或删除 ${DB_PATH} 后重启。`,
    );
    return;
  }

  if (legacyExists) {
    await fs.rename(LEGACY_PATH, DB_PATH);
    logger.info(`发现老地方还有数据库，已经帮你搬到 ${DB_PATH} 了，放心吧。`);
  }
};

const MIGRATIONS_TABLE = "__drizzle_migrations";

/**
 * 应用内联迁移（单 binary 运行时，migrations 目录不随包分发）。
 *
 * 复用 Drizzle 的 `__drizzle_migrations` 跟踪表与哈希约定（sha256(sql)、
 * created_at=journal.when），与开发态的 folder migrator 完全兼容 —— 同一个库
 * 无论先后被哪种方式迁移都不会重复执行。
 */
const applyEmbeddedMigrations = async (sqlite: Database): Promise<void> => {
  const { embeddedJournal, embeddedSqlFiles } = await import("#gen/migrations");
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

  sqlite
    .query(
      `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at INTEGER)`,
    )
    .run();
  const last = sqlite
    .query<{ created_at: number }, []>(
      `SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`,
    )
    .get();
  const pending = migrations.filter(
    (m) => !last || last.created_at < m.folderMillis,
  );
  if (pending.length === 0) {
    return;
  }
  const insertStmt = sqlite.prepare(
    `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`,
  );
  sqlite.transaction(() => {
    for (const migration of pending) {
      for (const stmt of migration.sql) {
        sqlite.run(stmt);
      }
      insertStmt.run(migration.hash, migration.folderMillis);
    }
  })();
};

/**
 * 应用待执行的迁移。
 * - 开发态：`migrations/` 目录存在 → Drizzle folder migrator。
 * - 单 binary：目录不存在 → 内联迁移（{@link applyEmbeddedMigrations}）。
 *
 * 独立连接执行，完成后关闭，与运行时的 `#server/db/client` 连接互不干扰。
 */
export const runMigrations = async (): Promise<void> => {
  const isNew = !(await exists(DB_PATH));
  logger.info(
    isNew
      ? "数据库不存在，正在初始化..."
      : "[MIGRATION] 检查并执行数据库迁移...",
  );

  const sqlite = new Database(DB_PATH);
  try {
    if (await exists(MIGRATIONS_DIR)) {
      migrate(drizzle(sqlite), { migrationsFolder: MIGRATIONS_DIR });
    } else {
      await applyEmbeddedMigrations(sqlite);
    }
    logger.info("[SUCCESS] 数据库准备就绪");
  } finally {
    sqlite.close();
  }
};
