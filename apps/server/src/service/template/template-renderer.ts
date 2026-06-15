import * as path from "node:path";

import { imageRenderer } from "#server/service/image-renderer";
import { getTemplateDir } from "#server/service/template/template-store";
import type { TemplateInstanceConfig } from "#shared/model/template/schema/instance";
import type { TemplateManifest } from "#shared/model/template/schema/manifest";

/** instanceName 预览时可为空字符串 */
export const renderTemplateInstance = async (
  config: TemplateInstanceConfig,
  instanceName: string,
  manifest: TemplateManifest,
  data: Record<string, unknown>,
  serverName: string,
): Promise<Buffer> => {
  const entryFilePath = path.join(getTemplateDir(manifest.id), "index.html");
  return imageRenderer.render_page(
    entryFilePath,
    {
      config,
      data,
      meta: {
        instanceName,
        serverName,
        templateId: manifest.id,
        version: manifest.version,
      },
    },
    manifest.viewport,
    {
      allowedOrigins: manifest.networkPermissions.map((p) => p.origin),
    },
  );
};
