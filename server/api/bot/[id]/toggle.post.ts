import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { botTable } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";

import { createApiResponse } from "#shared/model";
import { BotAPI } from "#shared/model/bot/api";
import { ApiError, createErrorResponse } from "#shared/model/error";

export default defineEventHandler(async (event) => {
  try {
    const botId = Number(getRouterParam(event, "id"));

    if (Number.isNaN(botId)) {
      return createErrorResponse(
        event,
        ApiError.validation("开关 Bot 失败：无效的 Bot ID"),
      );
    }

    const parsed = BotAPI.POSTTOGGLE.request.safeParse(await readBody(event));
    if (!parsed.success) {
      return createErrorResponse(
        event,
        ApiError.validation("开关 Bot 失败：配置无效"),
        parsed.error,
      );
    }

    const result = await db
      .update(botTable)
      .set({ enabled: parsed.data.enabled })
      .where(eq(botTable.id, botId))
      .returning();

    if (result[0]) {
      if (parsed.data.enabled) {
        chatBridge.addBot(botId, result[0].platform, result[0].config);
      } else {
        chatBridge.removeBot(botId);
      }
      return createApiResponse(event, "开关 Bot 成功", StatusCodes.OK);
    }
    return createErrorResponse(event, ApiError.notFound("Bot 不存在"));
  } catch (error) {
    logger.error(error, "开关 Bot 失败");
    const apiError = ApiError.internal("开关 Bot 失败");
    return createErrorResponse(event, apiError);
  }
});
