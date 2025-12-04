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
        const body: { enabled: boolean } = await readBody(event);

        if (typeof body.enabled !== "boolean") {
            const apiError = ApiError.validation("开关适配器失败: 缺少启用状态");
            return createErrorResponse(event, apiError);
        }

        if (isNaN(adapterID)) {
            const apiError = ApiError.validation("开关适配器失败: 无效的适配器ID");
            return createErrorResponse(event, apiError);
        }

        const database = await getDatabase();
        const result = await database
            .update(adapters)
            .set({ enabled: body.enabled })
            .where(eq(adapters.id, adapterID))
            .returning();

        if (result[0]) {
            if (body.enabled) {
                chatBridge.addBot(adapterID, result[0].type, result[0].config);
            } else {
                chatBridge.removeBot(adapterID);
            }
            return createApiResponse(event, "开关适配器成功", StatusCodes.OK);
        } else {
            const apiError = ApiError.database("开关适配器失败: 未能找到适配器");
            return createErrorResponse(event, apiError);
        }
    } catch (err) {
        logger.error({ err }, "开关适配器失败");
        const apiError = ApiError.internal("开关适配器失败");
        return createErrorResponse(event, apiError);
    }
});
