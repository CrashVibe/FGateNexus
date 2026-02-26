import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge/chatbridge";
import { AdapterAPI } from "~~/shared/schemas/adapter";

export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, "id"));
    const parsed = AdapterAPI.PUT.request.safeParse(await readBody(event));

    if (isNaN(id)) {
      const apiError = ApiError.validation("更新适配器失败：无效的适配器 ID");
      return createErrorResponse(event, apiError);
    }

    if (!parsed.success) {
      const apiError = ApiError.validation("更新适配器失败：配置无效" + parsed.error.message);
      return createErrorResponse(event, apiError, parsed.error);
    }

    const result = await db
      .update(adapters)
      .set({
        name: parsed.data.name,
        type: parsed.data.type,
        config: parsed.data.config
      })
      .where(eq(adapters.id, id))
      .returning();

    if (result[0]) {
      if (chatBridge.getConnectionData(result[0].id)) {
        await chatBridge.updateConfig(id, parsed.data.config);
      }
      return createApiResponse(event, "更新适配器成功", StatusCodes.OK);
    } else {
      const apiError = ApiError.database("更新适配器失败：未能更新适配器");
      return createErrorResponse(event, apiError);
    }
  } catch (err) {
    logger.error({ err }, "更新适配器失败");
    const apiError = ApiError.internal("更新适配器失败");
    return createErrorResponse(event, apiError);
  }
});
