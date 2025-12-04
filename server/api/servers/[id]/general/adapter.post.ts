import { defineEventHandler, readBody } from "h3";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { createApiResponse } from "#shared/types";
import { ApiError, createErrorResponse } from "#shared/error";
import { StatusCodes } from "http-status-codes";
import { chooseAdapterSchema } from "#shared/schemas/server/servers";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    try {
        const serverId = Number(getRouterParam(event, "id"));
        const body = await readBody(event);
        const parsed = chooseAdapterSchema.safeParse(body);

        if (isNaN(serverId)) {
            const apiError = ApiError.validation("参数错误: 无效的服务器ID");
            return createErrorResponse(event, apiError);
        }

        if (!parsed.success) {
            const apiError = ApiError.validation("参数错误");
            return createErrorResponse(event, apiError, parsed.error);
        }

        const database = await getDatabase();
        const result = await database
            .update(servers)
            .set({
                adapterId: parsed.data.adapterId
            })
            .where(eq(servers.id, serverId))
            .returning();

        if (!result[0]) {
            const apiError = ApiError.database("更新服务器对应适配器失败: 未能找到服务器");
            return createErrorResponse(event, apiError);
        }
        return createApiResponse(event, "更新服务器对应适配器成功", StatusCodes.OK);
    } catch (err) {
        logger.error({ err }, "更新服务器对应适配器失败");
        const apiError = ApiError.internal("更新服务器对应适配器失败");
        return createErrorResponse(event, apiError);
    }
});
