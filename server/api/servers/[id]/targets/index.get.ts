import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { TargetAPI } from "~~/shared/schemas/server/target";
export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (isNaN(serverID)) {
      const apiError = ApiError.validation("无效服务器 ID");
      return createErrorResponse(event, apiError);
    }
    const result = await db.query.targets.findMany({
      where: (target, { eq }) => eq(target.serverId, serverID)
    });
    if (!result) {
      const apiError = ApiError.notFound("服务器不存在");
      return createErrorResponse(event, apiError);
    }
    return createApiResponse(event, "获取服务器列表成功", StatusCodes.OK, TargetAPI.GETS.response.parse(result));
  } catch (err) {
    logger.error({ err }, "Database error");
    return createErrorResponse(event, ApiError.database("获取服务器列表失败"));
  }
});
