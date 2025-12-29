import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getConfigManager } from "./server/utils/config";

const execDir = path.dirname(path.resolve(process.execPath));
process.chdir(execDir);
console.info("工作目录在 ", process.cwd());

async function initDatabase() {
    const dbFilePath = path.resolve("./sqlite.db");
    const isNewDatabase = !(await fs
        .access(dbFilePath)
        .then(() => false)
        .catch(() => true));

    const client = new Database(dbFilePath);

    const db = drizzle(client);

    if (isNewDatabase) {
        console.info("数据库不存在，正在初始化...");
    } else {
        console.info("[MIGRATION] 检查并执行数据库迁移...");
    }

    try {
        migrate(db, {
            migrationsFolder: path.resolve("./migrations")
        });

        console.info("[SUCCESS] 数据库准备就绪");
    } catch (e) {
        console.error("数据库迁移失败：", e);
        process.exit(1);
    }
}

async function startApplication() {
    try {
        await initDatabase();
        const configManager = await getConfigManager();
        const config = configManager.getConfig();
        process.env.NITRO_HOST = config.nitro.host;
        process.env.NITRO_PORT = String(config.nitro.port);
        await import("./.output/server/index.mjs");
    } catch (e) {
        console.error("应用启动失败：", e);
        process.exit(1);
    }
}

startApplication();
