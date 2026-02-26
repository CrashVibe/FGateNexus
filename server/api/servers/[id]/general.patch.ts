import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { GeneralAPI } from "~~/shared/schemas/server/general";

export default defineEventHandler(async (event) => {
  try {
    const serverId = Number(getRouterParam(event, "id"));
    if (isNaN(serverId)) {
      const apiError = ApiError.validation("参数错误：无效的服务器 ID");
      return createErrorResponse(event, apiError);
    }

    const parsed = GeneralAPI.PATCH.request.safeParse(await readBody(event));

    if (!parsed.success) {
      return createErrorResponse(event, ApiError.validation("参数错误"), parsed.error);
    }

    if (parsed.data.adapterId !== undefined) {
      const result = await db
        .update(servers)
        .set({
          adapterId: parsed.data.adapterId
        })
        .where(eq(servers.id, serverId))
        .returning();

      if (!result.length) {
        const apiError = ApiError.database("更新服务器对应适配器失败：未能找到服务器");
        return createErrorResponse(event, apiError);
      }
    }

    return createApiResponse(event, "更新服务器对应适配器成功", StatusCodes.OK);
  } catch (err) {
    logger.error({ err }, "更新服务器对应适配器失败");
    const apiError = ApiError.internal("更新服务器对应适配器失败");
    return createErrorResponse(event, apiError);
  }
});
