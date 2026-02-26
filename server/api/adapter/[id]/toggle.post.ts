import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge/chatbridge";
import { AdapterAPI } from "~~/shared/schemas/adapter";

export default defineEventHandler(async (event) => {
  try {
    const adapterID = Number(getRouterParam(event, "id"));
    const parsed = AdapterAPI.POSTTOGGLE.request.safeParse(await readBody(event));

    if (!parsed.success) {
      const apiError = ApiError.validation("开关适配器失败：配置无效" + parsed.error.message);
      return createErrorResponse(event, apiError);
    }

    if (isNaN(adapterID)) {
      const apiError = ApiError.validation("开关适配器失败：无效的适配器 ID");
      return createErrorResponse(event, apiError);
    }

    const result = await db
      .update(adapters)
      .set({ enabled: parsed.data.enabled })
      .where(eq(adapters.id, adapterID))
      .returning();

    if (result[0]) {
      if (parsed.data.enabled) {
        chatBridge.addBot(adapterID, result[0].type, result[0].config);
      } else {
        chatBridge.removeBot(adapterID);
      }
      return createApiResponse(event, "开关适配器成功", StatusCodes.OK);
    } else {
      const apiError = ApiError.database("开关适配器失败：未能找到适配器");
      return createErrorResponse(event, apiError);
    }
  } catch (err) {
    logger.error({ err }, "开关适配器失败");
    const apiError = ApiError.internal("开关适配器失败");
    return createErrorResponse(event, apiError);
  }
});
