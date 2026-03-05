import * as fs from "node:fs/promises";
import * as path from "node:path";

import { defineNuxtModule } from "@nuxt/kit";

interface JournalEntry {
  tag: string;
}
interface Journal {
  entries: JournalEntry[];
}

const isJournalEntry = (v: unknown): v is JournalEntry => {
  if (typeof v !== "object" || v === null || !("tag" in v)) {
    return false;
  }
  return typeof v.tag === "string";
};

const isJournal = (v: unknown): v is Journal => {
  if (typeof v !== "object" || v === null || !("entries" in v)) {
    return false;
  }
  if (!Array.isArray(v.entries)) {
    return false;
  }
  return (v.entries as unknown[]).every(isJournalEntry);
};

const parseJournal = (raw: string): Journal => {
  const parsed: unknown = JSON.parse(raw);
  if (!isJournal(parsed)) {
    throw new Error("[embed-migrations] journal 格式无效");
  }
  return parsed;
};

const isBuild = process.env.NODE_ENV === "production";

export default defineNuxtModule({
  setup(_, nuxt) {
    nuxt.hook("nitro:init", (nitro) => {
      nitro.hooks.hook("compiled", async () => {
        if (!isBuild) {
          return;
        }
        const migrationsDir = path.resolve("migrations");
        const outputDir = path.resolve(".output/server/migrations");
        const journalPath = path.join(migrationsDir, "meta/_journal.json");

        try {
          await fs.access(journalPath);
        } catch {
          return;
        }

        await fs.mkdir(outputDir, { recursive: true });

        const journal = parseJournal(await fs.readFile(journalPath, "utf8"));
        const sqlLines: string[] = [];
        const mapEntries: string[] = [];

        for (const entry of journal.entries) {
          const sql = await fs.readFile(
            path.join(migrationsDir, `${entry.tag}.sql`),
            "utf8",
          );
          const varName = `sql_${entry.tag.replaceAll(/[^a-zA-Z0-9]/g, "_")}`;
          sqlLines.push(`const ${varName} = ${JSON.stringify(sql)};`);

          mapEntries.push(`  "${entry.tag}": ${varName}`);
        }

        await fs.writeFile(
          path.join(outputDir, "embedded.js"),
          [
            "// 此文件由 nuxt build 自动生成，请勿手动编辑。",
            "",
            ...sqlLines,
            "",
            `export const embeddedJournal = ${JSON.stringify(journal)};`,
            "",
            "export const embeddedSqlFiles = {",
            mapEntries.join(",\n"),
            "};",
            "",
          ].join("\n"),
        );
        console.info(
          "[embed-migrations] 已生成 .output/server/migrations/embedded.js",
        );
      });
    });
  },
});
