import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TemplateManifestSchema } from "@fgate/shared/model/template/schema/manifest";
import type {
  TemplateConfigField,
  TemplateDataSource,
  TemplateNetworkPermission,
  TemplateViewport,
} from "@fgate/shared/model/template/schema/manifest";

export interface TemplateManifestMeta {
  author?: string;
  description?: string;
  id: string;
  name: string;
  version: string;
  viewport?: TemplateViewport;
}

export interface GenerateManifestOptions {
  configSchema: readonly TemplateConfigField[];
  dataSources: readonly TemplateDataSource[];
  meta: TemplateManifestMeta;
  /** 渲染时需访问的第三方来源；reason 会在安装时提示管理员，默认无 */
  networkPermissions?: readonly TemplateNetworkPermission[];
  outFile: string | URL;
}

/** 由模板的 meta/dataSources/configSchema/networkPermissions 生成并写入 manifest.json，避免在模板包里维护两份 */
export const generateManifest = async ({
  configSchema,
  dataSources,
  meta,
  networkPermissions,
  outFile,
}: GenerateManifestOptions): Promise<void> => {
  const manifest = TemplateManifestSchema.parse({
    ...meta,
    configSchema,
    dataSources,
    networkPermissions,
  });

  const outPath = outFile instanceof URL ? fileURLToPath(outFile) : outFile;
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
};
