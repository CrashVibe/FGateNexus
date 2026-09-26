import path from "node:path";

import { imageRenderer } from "#server/service/image-renderer";
import type ServerSession from "#server/service/mcwsbridge/server-session";
import { resolveDataSources } from "#server/service/template/data-resolver";
import type { ResolveContext } from "#server/service/template/data-resolver";
import {
  getTemplateDir,
  getTemplateManifest,
} from "#server/service/template/template-store";
import type {
  TemplateInstance,
  TemplateInstanceConfig,
} from "#shared/model/template/schema/instance";
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
  return await imageRenderer.render_page(
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

/** 用真实服务器数据渲染一个实例 */
export const renderLiveInstance = async (
  instance: TemplateInstance,
  session: ServerSession,
  serverName: string,
  contextPlayer?: ResolveContext["contextPlayer"],
): Promise<Buffer> => {
  const manifest = await getTemplateManifest(instance.templateId);
  const data = await resolveDataSources(manifest, session, {
    config: instance.config,
    contextPlayer,
  });
  return await renderTemplateInstance(
    instance.config,
    instance.name,
    manifest,
    data,
    serverName,
  );
};
