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
    const parsed = BotAPI.POSTTOGGLE.request.safeParse(await readBody(event));

    if (!parsed.success) {
      const apiError = ApiError.validation(
        `开关 Bot 失败：配置无效${parsed.error.message}`,
      );
      return createErrorResponse(event, apiError);
    }

    if (Number.isNaN(botId)) {
      const apiError = ApiError.validation("开关 Bot 失败：无效的 Bot  ID");
      return createErrorResponse(event, apiError);
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
    const apiError = ApiError.database("开关 Bot 失败：未能找到 Bot ");
    return createErrorResponse(event, apiError);
  } catch (error) {
    logger.error(error, "开关 Bot 失败");
    const apiError = ApiError.internal("开关 Bot 失败");
    return createErrorResponse(event, apiError);
  }
});
