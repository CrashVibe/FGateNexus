import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge/chatbridge";
import { AdapterAPI} from "~~/shared/schemas/adapter";

export default defineEventHandler(async (event) => {
  try {
    const parsed = AdapterAPI.POST.request.safeParse(await readBody(event));
    if (!parsed.success) {
      const apiError = ApiError.validation("添加适配器失败：配置无效");
      return createErrorResponse(event, apiError, parsed.error);
    }

    const database = await getDatabase();
    const result = await database
      .insert(adapters)
      .values({
        name: parsed.data.name || "",
        type: parsed.data.type,
        config: parsed.data.config
      })
      .returning();
    if (result[0]) {
      chatBridge.addBot(result[0].id, parsed.data.type, parsed.data.config);
      return createApiResponse(event, "添加适配器成功", StatusCodes.CREATED);
    } else {
      const apiError = ApiError.database("添加适配器失败：未能插入适配器");
      return createErrorResponse(event, apiError);
    }
  } catch (err) {
    logger.error({ err }, "添加适配器失败");
    const apiError = ApiError.database("添加适配器失败");
    return createErrorResponse(event, apiError);
  }
});
