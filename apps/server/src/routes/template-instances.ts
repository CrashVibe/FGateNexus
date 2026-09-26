import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";

import { db } from "#server/db/client";
import { serverTable } from "#server/db/schema";
import { fail, guard, idParam, ok, parseBody } from "#server/http/respond";
import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import {
  ConfigValidationError,
  validateInstanceConfig,
} from "#server/service/template/config-validator";
import { DataResolveError } from "#server/service/template/data-resolver";
import { TemplateInstanceError } from "#server/service/template/instance-errors";
import { resolveMockDataSources } from "#server/service/template/mock-data-resolver";
import { templateInstanceStore } from "#server/service/template/template-instance-store";
import {
  renderLiveInstance,
  renderTemplateInstance,
} from "#server/service/template/template-renderer";
import {
  getTemplateManifest,
  TemplateStoreError,
} from "#server/service/template/template-store";
import { ApiError } from "#shared/model/error";
import {
  TemplateInstanceCreateSchema,
  TemplateInstanceRenderPreviewSchema,
  TemplateInstanceUpdateSchema,
} from "#shared/model/template/schema/instance";

/** 未知异常返回 null，交给 guard 兜底 500 */
const toApiError = (error: unknown): ApiError | null => {
  if (error instanceof TemplateInstanceError) {
    if (error.status === StatusCodes.NOT_FOUND) {
      return ApiError.notFound(error.message);
    }
    if (error.status === StatusCodes.CONFLICT) {
      return ApiError.conflict(error.message);
    }
    return ApiError.badRequest(error.message);
  }
  if (error instanceof ConfigValidationError) {
    return ApiError.badRequest(error.message);
  }
  if (error instanceof DataResolveError) {
    return ApiError.badRequest(error.message);
  }
  if (error instanceof TemplateStoreError) {
    return ApiError.notFound(error.message);
  }
  return null;
};

/** 未知异常重新抛出，交由 guard 兜底 */
const withDomainErrors = async (
  c: Context,
  fn: () => Promise<Response>,
): Promise<Response> => {
  try {
    return await fn();
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError) {
      return fail(c, apiError);
    }
    throw error;
  }
};

export const templateInstancesRouter = new Hono()
  .get(
    "/",
    guard("获取模板实例失败", async (c) =>
      ok(
        c,
        "获取模板实例成功",
        StatusCodes.OK,
        templateInstanceStore.listInstances(idParam(c, "serverId")),
      ),
    ),
  )
  .post(
    "/",
    guard("创建模板实例失败", async (c) => {
      const serverId = idParam(c, "serverId");
      const data = await parseBody(c, TemplateInstanceCreateSchema);
      const server = await db.query.serverTable.findFirst({
        where: eq(serverTable.id, serverId),
      });
      if (!server) {
        return fail(c, ApiError.notFound("服务器不存在"));
      }
      return await withDomainErrors(c, async () => {
        const manifest = await getTemplateManifest(data.templateId);
        const config = validateInstanceConfig(
          manifest.configSchema,
          data.config,
        );
        const instance = await templateInstanceStore.createInstance({
          binding: data.binding,
          config,
          enabled: data.enabled,
          name: data.name,
          serverId,
          templateId: data.templateId,
        });
        return ok(c, "创建模板实例成功", StatusCodes.CREATED, instance);
      });
    }),
  )
  .patch(
    "/:instanceId",
    guard("更新模板实例失败", async (c) => {
      const serverId = idParam(c, "serverId");
      const instanceId = c.req.param("instanceId") ?? "";
      const data = await parseBody(c, TemplateInstanceUpdateSchema);
      const existing = templateInstanceStore.getInstance(serverId, instanceId);
      if (!existing) {
        return fail(c, ApiError.notFound("模板实例不存在"));
      }
      return await withDomainErrors(c, async () => {
        let { config } = data;
        if (config !== undefined) {
          const manifest = await getTemplateManifest(existing.templateId);
          config = validateInstanceConfig(manifest.configSchema, config);
        }
        const result = await templateInstanceStore.updateInstance(
          serverId,
          instanceId,
          {
            binding: data.binding,
            config,
            enabled: data.enabled,
            name: data.name,
          },
        );
        return ok(c, "更新模板实例成功", StatusCodes.OK, result);
      });
    }),
  )
  .delete(
    "/:instanceId",
    guard("删除模板实例失败", async (c) => {
      const serverId = idParam(c, "serverId");
      const instanceId = c.req.param("instanceId") ?? "";
      return await withDomainErrors(c, async () => {
        templateInstanceStore.deleteInstance(serverId, instanceId);
        return ok(c, "删除模板实例成功", StatusCodes.OK);
      });
    }),
  )
  .post(
    "/render-preview",
    guard("渲染预览失败", async (c) => {
      const serverId = idParam(c, "serverId");
      const body = await parseBody(c, TemplateInstanceRenderPreviewSchema);

      const server = await db.query.serverTable.findFirst({
        where: eq(serverTable.id, serverId),
      });

      return await withDomainErrors(c, async () => {
        const manifest = await getTemplateManifest(body.templateId);
        const config = validateInstanceConfig(
          manifest.configSchema,
          body.config,
        );
        const data = resolveMockDataSources(manifest, config);
        const buffer = await renderTemplateInstance(
          config,
          "",
          manifest,
          data,
          server?.name ?? `Server #${serverId}`,
        );
        return new Response(new Uint8Array(buffer), {
          headers: { "content-type": "image/png" },
        });
      });
    }),
  )
  .post(
    "/:instanceId/render",
    guard("渲染模板失败", async (c) => {
      const serverId = idParam(c, "serverId");
      const instance = templateInstanceStore.getInstance(
        serverId,
        c.req.param("instanceId") ?? "",
      );
      if (!instance) {
        return fail(c, ApiError.notFound("模板实例不存在"));
      }

      const session = connectionManager.getConnectionByServerId(serverId);
      if (!session) {
        return fail(c, ApiError.badRequest("服务器未连接，无法渲染"));
      }
      const server = await db.query.serverTable.findFirst({
        where: eq(serverTable.id, serverId),
      });

      return await withDomainErrors(c, async () => {
        const buffer = await renderLiveInstance(
          instance,
          session,
          server?.name ?? `Server #${serverId}`,
        );
        return new Response(new Uint8Array(buffer), {
          headers: { "content-type": "image/png" },
        });
      });
    }),
  );
