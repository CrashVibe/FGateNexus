import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as fs from "node:fs";
import * as path from "node:path";

const execDir = path.dirname(path.resolve(process.execPath));
process.chdir(execDir);
console.log("工作目录在 ", process.cwd());

async function initDatabase() {
    const dbFilePath = path.resolve("./sqlite.db");
    const isNewDatabase = !fs.existsSync(dbFilePath);

    const client = new Database(dbFilePath);

    const db = drizzle(client);

    if (isNewDatabase) {
        console.log("🔧 数据库不存在，正在初始化...");
    } else {
        console.log("[MIGRATION] 检查并执行数据库迁移...");
    }

    try {
        migrate(db, {
            migrationsFolder: path.resolve("./migrations")
        });

        console.log("[SUCCESS] 数据库准备就绪");
    } catch (e) {
        console.error("数据库迁移失败:", e);
        process.exit(1);
    }
}

async function startApplication() {
    try {
        await initDatabase();

        // 直接导入并启动 Nitro 服务器
        await import("./.output/server/index.mjs");
    } catch (e) {
        console.error("应用启动失败:", e);
        process.exit(1);
    }
}

startApplication();
