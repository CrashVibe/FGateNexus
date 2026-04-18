import { and, eq, inArray } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { targets } from "~~/server/db/schema";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { TargetAPI } from "#shared/model/server/target";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverID)) {
      return createErrorResponse(event, ApiError.validation("无效的 ID"));
    }

    const parsed = TargetAPI.DELETE.request.safeParse(await readBody(event));
    if (!parsed.success) {
      return createErrorResponse(
        event,
        ApiError.validation("请求体格式不正确"),
        parsed.error,
      );
    }
    const { ids } = parsed.data;

    const deleted = await db
      .delete(targets)
      .where(and(eq(targets.serverId, serverID), inArray(targets.id, ids)))
      .returning();

    if (deleted.length === 0) {
      return createErrorResponse(event, ApiError.notFound("未匹配到任何目标"));
    }

    return createApiResponse(
      event,
      "批量删除目标成功",
      StatusCodes.OK,
      TargetAPI.DELETE.response.parse(deleted),
    );
  } catch (error) {
    logger.error(error, "Database error");
    return createErrorResponse(event, ApiError.database("批量删除目标失败"));
  }
});
