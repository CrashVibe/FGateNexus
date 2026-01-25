import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge/chatbridge";

export default defineEventHandler(async (event) => {
  try {
    const adapterID = Number(getRouterParam(event, "id"));

    if (isNaN(adapterID)) {
      const apiError = ApiError.validation("无效的适配器 ID");
      return createErrorResponse(event, apiError);
    }

    const database = await getDatabase();
    const adapter = await database.query.adapters.findFirst({
      where: eq(adapters.id, adapterID)
    });

    if (!adapter) {
      const apiError = ApiError.database("未能找到适配器");
      return createErrorResponse(event, apiError);
    }
    let isOnline = false;
    if (!chatBridge.getConnectionData(adapter.id)) {
      isOnline = false;
    } else {
      isOnline = chatBridge.isOnline(adapter.id);
    }

    return createApiResponse(event, `获取 ${adapterID} 适配器成功`, StatusCodes.OK, {
      ...adapter,
      isOnline
    });
  } catch {
    const apiError = ApiError.internal(`获取 ${Number(getRouterParam(event, "id"))} 适配器失败`);
    return createErrorResponse(event, apiError);
  }
});
