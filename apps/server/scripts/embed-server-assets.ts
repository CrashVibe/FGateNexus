import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * 遍历 apps/web/dist，把每个产物内联为字符串（文本直存、二进制 base64），
 * 生成 apps/server/dist/assets.ts，供 bun build --compile 打进单 binary。
 */
const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const DIST_DIR = path.join(REPO_ROOT, "apps/web/dist");
const OUT_FILE = path.join(REPO_ROOT, "apps/server/dist/assets.ts");

const walk = async (dir: string): Promise<string[]> => {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    out.push(...(entry.isDirectory() ? await walk(full) : [full]));
  }
  return out;
};

const main = async (): Promise<void> => {
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  const files = await walk(DIST_DIR);
  const mapEntries: string[] = [];
  let indexBody = "null";

  for (const file of files) {
    const rel = path.relative(DIST_DIR, file).split(path.sep).join("/");
    const urlPath = `/${rel}`;
    const { type } = Bun.file(file);
    const isText =
      type.startsWith("text/") || /json|javascript|svg|xml/.test(type);
    const buf = await fs.readFile(file);
    const body = isText ? buf.toString("utf-8") : buf.toString("base64");
    const literal = JSON.stringify(body);
    mapEntries.push(
      `  ${JSON.stringify(urlPath)}: { base64: ${!isText}, body: ${literal}, type: ${JSON.stringify(type)} },`,
    );
    if (urlPath === "/index.html") {
      indexBody = literal;
    }
  }

  await fs.writeFile(
    OUT_FILE,
    `// 此文件由 apps/server/scripts/embed-server-assets.ts 自动生成，请勿手动编辑。\nexport const embeddedAssets: Record<string, { body: string; base64: boolean; type: string }> = {\n${mapEntries.join("\n")}\n};\n\nexport const indexHtmlBody: string | null = ${indexBody};\n`,
    "utf-8",
  );
  process.stdout.write(
    `[embed-server-assets] 已内联 ${files.length} 个文件 → apps/server/dist/assets.ts\n`,
  );
};

await main();
