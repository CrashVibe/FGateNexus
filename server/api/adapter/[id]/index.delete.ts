import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge/chatbridge";

export default defineEventHandler(async (event) => {
  try {
    const adapterID = Number(getRouterParam(event, "id"));

    if (isNaN(adapterID)) {
      const apiError = ApiError.validation("无效的适配器 ID");
      return createErrorResponse(event, apiError);
    }

    const result = await db.delete(adapters).where(eq(adapters.id, adapterID)).returning();

    if (result[0]) {
      chatBridge.removeBot(adapterID);
      return createApiResponse(event, "删除适配器成功", StatusCodes.OK);
    } else {
      const apiError = ApiError.database("未能找到适配器");
      return createErrorResponse(event, apiError);
    }
  } catch {
    const apiError = ApiError.internal("删除适配器失败");
    return createErrorResponse(event, apiError);
  }
});
