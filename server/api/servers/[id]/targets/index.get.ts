import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { TargetAPI } from "#shared/model/server/api";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverID)) {
      const apiError = ApiError.validation("无效服务器 ID");
      return createErrorResponse(event, apiError);
    }
    const result = await db.query.targetTable.findMany({
      where: (target, { eq }) => eq(target.serverId, serverID),
    });
    return createApiResponse(
      event,
      "获取服务器目标列表成功",
      StatusCodes.OK,
      TargetAPI.GETS.response.parse(result),
    );
  } catch (error) {
    logger.error(error, "获取目标列表失败");
    return createErrorResponse(event, ApiError.internal("获取目标列表失败"));
  }
});
