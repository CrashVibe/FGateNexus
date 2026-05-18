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
      const apiError = ApiError.validation("无效的 Bot ID");
      return createErrorResponse(event, apiError);
    }

    const bot = await db.query.botTable.findFirst({
      where: eq(botTable.id, botId),
    });

    if (!bot) {
      const apiError = ApiError.database("未能找到 Bot");
      return createErrorResponse(event, apiError);
    }
    const connection = chatBridge.get(bot.id);
    const isOnline = connection ? connection.isOnline() : false;

    return createApiResponse(
      event,
      `获取 ${botId} Bot 成功`,
      StatusCodes.OK,
      BotAPI.GET.response.parse({
        ...bot,
        isOnline,
      }),
    );
  } catch {
    const apiError = ApiError.internal(
      `获取 ${Number(getRouterParam(event, "id"))} Bot 失败`,
    );
    return createErrorResponse(event, apiError);
  }
});
