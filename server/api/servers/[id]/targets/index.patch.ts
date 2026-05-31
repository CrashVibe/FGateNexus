import { and, eq, sql } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { targetTable } from "~~/server/db/schema";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { TargetAPI } from "#shared/model/server/api";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverID)) {
      return createErrorResponse(event, ApiError.validation("无效的 ID"));
    }

    const parsed = TargetAPI.PATCH.request.safeParse(await readBody(event));
    if (!parsed.success) {
      return createErrorResponse(
        event,
        ApiError.validation("请求体格式不正确"),
        parsed.error,
      );
    }

    const { items } = parsed.data;

    if (items.length === 0) {
      return createErrorResponse(event, ApiError.validation("更新项不能为空"));
    }

    const updatePromises = items.map(({ id, data }) =>
      db
        .update(targetTable)
        .set({
          ...data,
          updatedAt: sql`(unixepoch())`,
        })
        .where(and(eq(targetTable.serverId, serverID), eq(targetTable.id, id)))
        .returning(),
    );

    // 并行更新
    const results = await Promise.all(updatePromises);
    const updatedRows = results.flat();

    if (updatedRows.length === 0) {
      return createErrorResponse(event, ApiError.notFound("未匹配到任何目标"));
    }

    return createApiResponse(
      event,
      "批量更新成功",
      StatusCodes.OK,
      updatedRows,
    );
  } catch (error) {
    logger.error(error, "批量更新目标失败");
    return createErrorResponse(event, ApiError.internal("批量更新失败"));
  }
});
