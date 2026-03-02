import { defineNuxtModule } from "@nuxt/kit";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const isBuild = process.env.NODE_ENV === "production";

export default defineNuxtModule({
  setup(_, nuxt) {
    nuxt.hook("nitro:init", (nitro) => {
      nitro.hooks.hook("compiled", async () => {
        if (!isBuild) return
        const migrationsDir = path.resolve("migrations");
        const outputDir = path.resolve(".output/server/migrations");
        const journalPath = path.join(migrationsDir, "meta/_journal.json");

        try {
          await fs.access(journalPath);
        } catch {
          return;
        }

        await fs.mkdir(outputDir, { recursive: true });
        const journal = JSON.parse(await fs.readFile(journalPath, "utf-8"));
        const sqlLines: string[] = [];
        const mapEntries: string[] = [];

        for (const entry of journal.entries) {
          const sql = await fs.readFile(path.join(migrationsDir, `${entry.tag}.sql`), "utf-8");
          const varName = `sql_${entry.tag.replace(/[^a-zA-Z0-9]/g, "_")}`;
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
            ""
          ].join("\n")
        );
        console.info("[embed-migrations] 已生成 .output/server/migrations/embedded.js");
      });
    });
  }
});
