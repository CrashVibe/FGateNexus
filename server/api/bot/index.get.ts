import { StatusCodes } from "http-status-codes";
import type { z } from "zod";
import { db } from "~~/server/db/client";
import { botTable } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";

import { createApiResponse } from "#shared/model";
import { BotAPI } from "#shared/model/bot/api";
import { ApiError, createErrorResponse } from "#shared/model/error";

export default defineEventHandler(async (event) => {
  try {
    const result = await db.select().from(botTable);

    const botsWithStatus: z.infer<typeof BotAPI.GETS.response> = result.map(
      (bot) => {
        const connection = chatBridge.get(bot.id);
        const isOnline = connection ? connection.isOnline() : false;
        return {
          ...bot,
          isOnline,
        };
      },
    );

    return createApiResponse(
      event,
      "获取 Bot 列表成功",
      StatusCodes.OK,
      BotAPI.GETS.response.parse(botsWithStatus),
    );
  } catch (error) {
    logger.error(error, "获取 Bot 列表失败");
    return createErrorResponse(event, ApiError.database("获取 Bot 列表失败"));
  }
});
