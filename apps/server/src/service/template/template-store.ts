import * as fs from "node:fs";
import * as path from "node:path";

import extract from "extract-zip";

import { logger } from "#server/utils/logger";
import {
  TemplateIdSchema,
  TemplateManifestSchema,
} from "#shared/model/template/schema/manifest";
import type { TemplateManifest } from "#shared/model/template/schema/manifest";

export const TEMPLATE_DIR = path.resolve(process.cwd(), "data/templates");
const TEMPLATE_TMP_DIR = path.resolve(process.cwd(), "data/templates-tmp");

/** 防 zip bomb */
const MAX_FILES = 1000;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const log = logger.child({}, { msgPrefix: "[Template] " });

/** 路由层据 message 返回 4xx */
export class TemplateStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateStoreError";
  }
}

const templatePath = (id: string): string => path.join(TEMPLATE_DIR, id);

/** 同时防路径穿越 */
const assertValidId = (id: string): string => {
  const parsed = TemplateIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new TemplateStoreError(`非法的模板 id：${id}`);
  }
  return parsed.data;
};

/** 逐条目校验路径包含与体积上限 */
const extractWithGuards = async (
  zipPath: string,
  destDir: string,
): Promise<void> => {
  const destPrefix = destDir + path.sep;
  let fileCount = 0;
  let totalBytes = 0;

  await extract(zipPath, {
    dir: destDir,
    onEntry: (entry) => {
      // zip-slip 防护
      const resolved = path.resolve(destDir, entry.fileName);
      if (resolved !== destDir && !resolved.startsWith(destPrefix)) {
        throw new TemplateStoreError(
          `检测到非法的压缩包路径：${entry.fileName}`,
        );
      }

      // 目录条目不计入
      if (entry.fileName.endsWith("/")) {
        return;
      }

      fileCount += 1;
      if (fileCount > MAX_FILES) {
        throw new TemplateStoreError(`压缩包文件数超出上限（${MAX_FILES}）`);
      }

      const size = entry.uncompressedSize;
      if (size > MAX_FILE_BYTES) {
        throw new TemplateStoreError(`单个文件体积超出上限：${entry.fileName}`);
      }
      totalBytes += size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new TemplateStoreError(
          `压缩包解压后总体积超出上限（${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB）`,
        );
      }
    },
  });
};

const readManifest = async (dir: string): Promise<TemplateManifest> => {
  const manifestPath = path.join(dir, "manifest.json");
  let raw: string;
  try {
    raw = await fs.promises.readFile(manifestPath, "utf-8");
  } catch {
    throw new TemplateStoreError("缺少 manifest.json");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new TemplateStoreError("manifest.json 不是合法 JSON");
  }

  const parsed = TemplateManifestSchema.safeParse(json);
  if (!parsed.success) {
    throw new TemplateStoreError(
      `manifest.json 校验失败：${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
    );
  }
  return parsed.data;
};

/** 压缩包即 dist/ 内容，无需嵌套目录；同 id 已存在则替换 */
export const installTemplate = async (
  zipBuffer: Buffer,
): Promise<TemplateManifest> => {
  await fs.promises.mkdir(TEMPLATE_TMP_DIR, { recursive: true });
  const token = crypto.randomUUID();
  const zipPath = path.join(TEMPLATE_TMP_DIR, `upload-${token}.zip`);
  const extractDir = path.join(TEMPLATE_TMP_DIR, `extract-${token}`);

  try {
    await fs.promises.writeFile(zipPath, zipBuffer);
    await fs.promises.mkdir(extractDir, { recursive: true });
    await extractWithGuards(zipPath, extractDir);

    const manifest = await readManifest(extractDir);

    const entryPath = path.join(extractDir, "index.html");
    if (!fs.existsSync(entryPath)) {
      throw new TemplateStoreError("缺少入口文件 index.html");
    }

    const dest = templatePath(manifest.id);
    await fs.promises.mkdir(TEMPLATE_DIR, { recursive: true });
    await fs.promises.rm(dest, { force: true, recursive: true });
    await fs.promises.rename(extractDir, dest);

    log.info({ id: manifest.id, version: manifest.version }, "模板安装成功");
    return manifest;
  } finally {
    await fs.promises.rm(zipPath, { force: true });
    await fs.promises.rm(extractDir, { force: true, recursive: true });
  }
};

/** 文件系统即数据源，无缓存 */
export const listTemplates = async (): Promise<TemplateManifest[]> => {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    return [];
  }
  const entries = await fs.promises.readdir(TEMPLATE_DIR, {
    withFileTypes: true,
  });
  const result: TemplateManifest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      result.push(await readManifest(path.join(TEMPLATE_DIR, entry.name)));
    } catch (error) {
      log.warn({ dir: entry.name, error }, "跳过无效模板目录");
    }
  }
  return result;
};

export const getTemplateManifest = async (
  id: string,
): Promise<TemplateManifest> => {
  const validId = assertValidId(id);
  const dir = templatePath(validId);
  if (!fs.existsSync(dir)) {
    throw new TemplateStoreError(`模板不存在：${validId}`);
  }
  return readManifest(dir);
};

/** 即 dist/ 内容所在目录 */
export const getTemplateDir = (id: string): string =>
  templatePath(assertValidId(id));

/** 调用方需先校验无实例引用 */
export const removeTemplate = async (id: string): Promise<void> => {
  const validId = assertValidId(id);
  const dir = templatePath(validId);
  if (!fs.existsSync(dir)) {
    throw new TemplateStoreError(`模板不存在：${validId}`);
  }
  await fs.promises.rm(dir, { force: true, recursive: true });
  log.info({ id: validId }, "模板已删除");
};
