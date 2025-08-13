import { defineEventHandler } from "h3";
import { getDatabase } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { createApiResponse } from "#shared/types";
import { ApiError, createErrorResponse } from "#shared/error";
import { StatusCodes } from "http-status-codes";
import { eq } from "drizzle-orm";
import { chatBridge } from "~~/server/service/chatbridge/chatbridge";
export default defineEventHandler(async (event) => {
    try {
        const adapterID = Number(getRouterParam(event, "id"));

        if (isNaN(adapterID)) {
            const apiError = ApiError.validation("无效的适配器ID");
            return createErrorResponse(event, apiError);
        }

        const database = await getDatabase();
        const result = await database.delete(adapters).where(eq(adapters.id, adapterID)).returning();

        if (result[0]) {
            chatBridge.removeBot(adapterID);
            return createApiResponse("删除适配器成功", StatusCodes.OK);
        } else {
            const apiError = ApiError.database("未能找到适配器");
            return createErrorResponse(event, apiError);
        }
    } catch {
        const apiError = ApiError.internal("删除适配器失败");
        return createErrorResponse(event, apiError);
    }
});
