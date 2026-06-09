import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * 把 `migrations/` 下的 journal + SQL 内联生成
 * `apps/server/dist/migrations.ts`，供编译为单 binary 后在运行时应用
 * （单 binary 不再附带 migrations 目录）。开发态仍直接读 migrations 目录。
 */
const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "migrations");
const OUT_FILE = path.join(REPO_ROOT, "apps/server/dist/migrations.ts");

interface JournalEntry {
  tag: string;
  when: number;
  breakpoints: boolean;
}

const main = async (): Promise<void> => {
  const journalRaw = await fs.readFile(
    path.join(MIGRATIONS_DIR, "meta/_journal.json"),
    "utf-8",
  );
  const journal = JSON.parse(journalRaw) as { entries: JournalEntry[] };

  const entries = journal.entries.map((e) => ({
    breakpoints: e.breakpoints,
    tag: e.tag,
    when: e.when,
  }));

  const sqlFiles: Record<string, string> = {};
  for (const entry of entries) {
    sqlFiles[entry.tag] = await fs.readFile(
      path.join(MIGRATIONS_DIR, `${entry.tag}.sql`),
      "utf-8",
    );
  }

  const content = `// 此文件由 apps/server/scripts/gen-embedded-migrations.ts 自动生成，请勿手动编辑。
export interface EmbeddedJournalEntry {
  tag: string;
  when: number;
  breakpoints: boolean;
}

export const embeddedJournal: { entries: EmbeddedJournalEntry[] } = ${JSON.stringify(
    { entries },
    null,
    2,
  )};

export const embeddedSqlFiles: Record<string, string> = ${JSON.stringify(
    sqlFiles,
    null,
    2,
  )};
`;

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, content, "utf-8");
  process.stdout.write(
    `[gen-embedded-migrations] 已生成 ${path.relative(REPO_ROOT, OUT_FILE)}(${entries.length} 个迁移)\n`,
  );

  // 若 assets.ts 不存在（前端尚未构建），生成空占位供 TypeScript 编译通过。
  // 正式内容由 apps/web/vite.config.ts 的 embedServerAssets 插件在 build:web 时写入。
  const assetsFile = path.join(REPO_ROOT, "apps/server/dist/assets.ts");
  const assetsExists = await fs
    .access(assetsFile)
    .then(() => true)
    .catch(() => false);
  if (!assetsExists) {
    await fs.writeFile(
      assetsFile,
      "// 此文件由 apps/web/vite.config.ts 自动生成，请勿手动编辑。\nexport const embeddedAssets: Record<string, { body: string; base64: boolean; type: string }> = {};\n\nexport const indexHtmlBody: string | null = null;\n",
      "utf-8",
    );
    process.stdout.write(
      "[gen-embedded-migrations] 已生成 apps/server/dist/assets.ts 空占位\n",
    );
  }
};

await main();
