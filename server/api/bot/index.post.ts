import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { botTable } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";

import { createApiResponse } from "#shared/model";
import { BotAPI } from "#shared/model/bot/api";
import { ApiError, createErrorResponse } from "#shared/model/error";

export default defineEventHandler(async (event) => {
  try {
    const parsed = BotAPI.POST.request.safeParse(await readBody(event));
    if (!parsed.success) {
      const apiError = ApiError.validation("添加 Bot 失败：配置无效");
      return createErrorResponse(event, apiError, parsed.error);
    }

    const result = await db
      .insert(botTable)
      .values({
        config: parsed.data.config,
        name: parsed.data.name ?? "",
        platform: parsed.data.platform,
      })
      .returning();
    if (result[0]) {
      chatBridge.addBot(result[0].id, parsed.data.platform, parsed.data.config);
      return createApiResponse(event, "添加 Bot 成功", StatusCodes.CREATED);
    }
    const apiError = ApiError.database("添加 Bot 失败：未能插入 Bot ");
    return createErrorResponse(event, apiError);
  } catch (error) {
    logger.error(error, "添加 Bot 失败");
    const apiError = ApiError.database("添加 Bot 失败");
    return createErrorResponse(event, apiError);
  }
});
