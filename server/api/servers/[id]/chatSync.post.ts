import { defineEventHandler, readBody } from "h3";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { createApiResponse } from "#shared/types";
import { ApiError, createErrorResponse } from "#shared/error";
import { StatusCodes } from "http-status-codes";
import { eq } from "drizzle-orm";
import { chatSyncConfigSchema as ChatSyncConfigSchema } from "~~/shared/schemas/server/chatSync";

export default defineEventHandler(async (event) => {
    try {
        const serverId = Number(getRouterParam(event, "id"));
        const body = await readBody(event);
        const parsed = ChatSyncConfigSchema.safeParse(body);

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
                chatSyncConfig: parsed.data
            })
            .where(eq(servers.id, serverId))
            .returning();

        if (!result[0]) {
            const apiError = ApiError.database("更新服务器聊天同步配置失败: 未能找到服务器");
            return createErrorResponse(event, apiError);
        }
        return createApiResponse(event, "更新服务器聊天同步配置成功", StatusCodes.OK);
    } catch (err) {
        console.error("更新服务器聊天同步配置失败：", err);
        const apiError = ApiError.internal("更新服务器聊天同步配置失败");
        return createErrorResponse(event, apiError);
    }
});
