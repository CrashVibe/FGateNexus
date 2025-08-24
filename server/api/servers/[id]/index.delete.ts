import { defineEventHandler } from "h3";
import { getDatabase } from "~~/server/db/client";
import { createApiResponse } from "#shared/types";
import { ApiError, createErrorResponse } from "#shared/error";
import { StatusCodes } from "http-status-codes";
import { servers } from "~~/server/db/schema";
import { eq } from "drizzle-orm";
import { pluginBridge } from "~~/server/service/mcwsbridge/MCWSBridge";

export default defineEventHandler(async (event) => {
    try {
        const idParam = event.context.params?.["id"];
        if (!idParam) {
            const apiError = ApiError.validation("缺少服务器ID");
            return createErrorResponse(event, apiError);
        }
        const serverID = parseInt(idParam, 10);
        if (isNaN(serverID)) {
            const apiError = ApiError.validation("无效服务器ID");
            return createErrorResponse(event, apiError);
        }
        const database = await getDatabase();
        const result = await database.query.servers.findFirst({
            where: (server, { eq: _eq }) => _eq(server.id, serverID)
        });
        if (!result) {
            const apiError = ApiError.notFound("服务器不存在");
            return createErrorResponse(event, apiError);
        }

        const deleteResult = await database.delete(servers).where(eq(servers.id, serverID)).returning();

        if (deleteResult[0]) {
            if (pluginBridge.connectionManager.getConnectionData(serverID)) {
                pluginBridge.connectionManager.removeConnection(undefined, serverID);
            }
            return createApiResponse(event, "删除服务器成功", StatusCodes.OK, { id: serverID });
        } else {
            const apiError = ApiError.database("未能删除服务器");
            return createErrorResponse(event, apiError);
        }
    } catch (err) {
        console.error("Database error:", err);
        return createErrorResponse(event, ApiError.database("获取服务器列表失败"));
    }
});
