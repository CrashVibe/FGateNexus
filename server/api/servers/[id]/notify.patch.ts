import { and, eq, inArray, sql } from "drizzle-orm";
import { defineEventHandler, getRouterParam, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { serverTable, targetTable } from "~~/server/db/schema";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { NotifyAPI } from "#shared/model/server/api";

export default defineEventHandler(async (event) => {
  try {
    const serverId = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverId)) {
      const apiError = ApiError.validation("参数错误：无效的服务器 ID");
      return createErrorResponse(event, apiError);
    }

    const body: unknown = await readBody(event);
    const parsed = NotifyAPI.PATCH.request.safeParse(body);
    if (!parsed.success) {
      const apiError = ApiError.validation("参数错误");
      return createErrorResponse(event, apiError, parsed.error);
    }

    const { notify, targets: items } = parsed.data;

    db.transaction((tx) => {
      tx.update(serverTable)
        .set({ notifyConfig: notify })
        .where(eq(serverTable.id, serverId))
        .run();

      if (items.length === 0) {
        return;
      }

      const ids = items.map((i) => i.id);

      const exists = tx
        .select()
        .from(targetTable)
        .where(
          and(eq(targetTable.serverId, serverId), inArray(targetTable.id, ids)),
        )
        .all();

      if (exists.length !== ids.length) {
        const okSet = new Set(exists.map((e) => e.id));
        const invalidIds = ids.filter((x) => !okSet.has(x));
        throw ApiError.validation(
          `存在与该服务器不匹配或不存在的目标 ID: ${invalidIds.join(", ")}`,
        );
      }

      for (const i of items) {
        tx.update(targetTable)
          .set({
            config: i.config,
            updatedAt: sql`(unixepoch())`,
          })
          .where(
            and(eq(targetTable.id, i.id), eq(targetTable.serverId, serverId)),
          )
          .run();
      }
    });

    return createApiResponse(event, "更新服务器通知配置成功", StatusCodes.OK);
  } catch (error: unknown) {
    logger.error(error, "更新服务器通知配置失败");
    const apiError =
      error instanceof ApiError
        ? error
        : ApiError.internal("更新服务器通知配置失败");
    return createErrorResponse(event, apiError);
  }
});
