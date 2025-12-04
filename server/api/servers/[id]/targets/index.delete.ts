import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { and, eq, inArray } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { targets } from "~~/server/db/schema";
import { batchIdsSchema } from "~~/shared/schemas/server/target";
export default defineEventHandler(async (event) => {
    try {
        const serverID = Number(getRouterParam(event, "id"));
        if (Number.isNaN(serverID)) return createErrorResponse(event, ApiError.validation("无效的 ID"));

        const body = await readBody(event);
        const parsed = batchIdsSchema.safeParse(body);
        if (!parsed.success) {
            return createErrorResponse(event, ApiError.validation("请求体格式不正确"));
        }
        const { ids } = parsed.data;

        const db = await getDatabase();

        // 限定 serverId，避免误删其他服务器的数据
        const deleted = await db
            .delete(targets)
            .where(and(eq(targets.serverId, serverID), inArray(targets.id, ids)))
            .returning();

        if (deleted.length === 0) {
            return createErrorResponse(event, ApiError.notFound("未匹配到任何目标"));
        }

        return createApiResponse(event, "批量删除目标成功", StatusCodes.OK, deleted);
    } catch (err) {
        logger.error({ err }, "Database error");
        return createErrorResponse(event, ApiError.database("批量删除目标失败"));
    }
});
