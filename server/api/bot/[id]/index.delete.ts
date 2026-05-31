import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { botTable } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";

export default defineEventHandler(async (event) => {
  try {
    const botId = Number(getRouterParam(event, "id"));

    if (Number.isNaN(botId)) {
      const apiError = ApiError.validation("无效的 Bot ID");
      return createErrorResponse(event, apiError);
    }

    const result = await db
      .delete(botTable)
      .where(eq(botTable.id, botId))
      .returning();

    if (result[0]) {
      chatBridge.removeBot(botId);
      return createApiResponse(event, "删除 Bot 成功", StatusCodes.OK);
    }
    const apiError = ApiError.notFound("Bot 不存在");
    return createErrorResponse(event, apiError);
  } catch (error) {
    logger.error(error, "删除 Bot 失败");
    const apiError = ApiError.internal("删除 Bot 失败");
    return createErrorResponse(event, apiError);
  }
});
