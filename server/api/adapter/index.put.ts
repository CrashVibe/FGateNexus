import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { adapters } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge/chatbridge";
import { AdapterConfigSchema, AdapterType, type BotInstanceData } from "~~/shared/schemas/adapter";

export default defineEventHandler(async (event) => {
    try {
        const body: BotInstanceData = await readBody(event);
        const config = AdapterConfigSchema.safeParse(body.config);

        if (!body.adapterID) {
            const apiError = ApiError.validation("更新适配器失败：缺少适配器 ID");
            return createErrorResponse(event, apiError);
        }

        if (body.adapterType === null || !Object.values(AdapterType).includes(body.adapterType)) {
            const apiError = ApiError.validation("更新适配器失败：适配器类型无效");
            return createErrorResponse(event, apiError);
        }

        if (!config.success) {
            const apiError = ApiError.validation("更新适配器失败：配置无效");
            return createErrorResponse(event, apiError, config.error);
        }

        const database = await getDatabase();
        const result = await database
            .update(adapters)
            .set({
                name: body.name || "",
                type: body.adapterType,
                config: config.data
            })
            .where(eq(adapters.id, body.adapterID))
            .returning();

        if (result[0]) {
            if (chatBridge.getConnectionData(result[0].id)) {
                await chatBridge.updateConfig(body.adapterID, config.data);
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
