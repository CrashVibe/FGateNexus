import { eq } from "drizzle-orm";
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
    const id = Number(getRouterParam(event, "id"));
    const parsed = BotAPI.PUT.request.safeParse(await readBody(event));

    if (Number.isNaN(id)) {
      const apiError = ApiError.validation("更新 Bot 失败：无效的 Bot  ID");
      return createErrorResponse(event, apiError);
    }

    if (!parsed.success) {
      const apiError = ApiError.validation(
        `更新 Bot 失败：配置无效${parsed.error.message}`,
      );
      return createErrorResponse(event, apiError, parsed.error);
    }

    const result = await db
      .update(botTable)
      .set({
        config: parsed.data.config,
        name: parsed.data.name,
      })
      .where(eq(botTable.id, id))
      .returning();

    if (result[0]) {
      const connection = chatBridge.get(id);
      if (connection) {
        chatBridge.updateConfig(id, parsed.data.config);
      }
      return createApiResponse(event, "更新 Bot 成功", StatusCodes.OK);
    }
    const apiError = ApiError.database("更新 Bot 失败：未能更新 Bot ");
    return createErrorResponse(event, apiError);
  } catch (error) {
    logger.error(error, "更新 Bot 失败");
    const apiError = ApiError.internal("更新 Bot 失败");
    return createErrorResponse(event, apiError);
  }
});
