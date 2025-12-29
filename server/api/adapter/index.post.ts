import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
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
        if (body.adapterType === null || !Object.values(AdapterType).includes(body.adapterType)) {
            const apiError = ApiError.validation("添加适配器失败：适配器类型无效");
            return createErrorResponse(event, apiError);
        }
        if (!config.success) {
            const apiError = ApiError.validation("添加适配器失败：配置无效");
            return createErrorResponse(event, apiError, config.error);
        }

        const database = await getDatabase();
        const result = await database
            .insert(adapters)
            .values({
                name: body.name || "",
                type: body.adapterType,
                config: config.data
            })
            .returning();
        if (result[0]) {
            chatBridge.addBot(result[0].id, body.adapterType, config.data);
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
