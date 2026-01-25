import { and, eq, sql } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { targets } from "~~/server/db/schema";
import { ApiError, createErrorResponse } from "~~/shared/error";
import { batchDifferentDataSchema } from "~~/shared/schemas/server/target";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverID)) return createErrorResponse(event, ApiError.validation("无效的 ID"));

    const body = await readBody(event);
    const parsed = batchDifferentDataSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(event, ApiError.validation("请求体格式不正确"));
    }

    const db = await getDatabase();
    const { items } = parsed.data;

    if (items.length === 0) {
      return createErrorResponse(event, ApiError.validation("更新项不能为空"));
    }

    const updatePromises = items.map(({ id, data }) =>
      db
        .update(targets)
        .set({
          targetId: data.targetId,
          type: data.type,
          enabled: data.enabled,
          config: data.config ?? undefined,
          updatedAt: sql`(unixepoch())`
        })
        .where(and(eq(targets.serverId, serverID), eq(targets.id, id)))
        .returning()
    );

    // 并行更新
    const results = await Promise.all(updatePromises);
    const updatedRows = results.flat();

    if (updatedRows.length === 0) {
      return createErrorResponse(event, ApiError.notFound("未匹配到任何目标"));
    }

    return createApiResponse(event, "批量更新成功", StatusCodes.OK, updatedRows);
  } catch (err) {
    logger.error({ err }, "Database error");
    return createErrorResponse(event, ApiError.database("批量更新失败"));
  }
});
