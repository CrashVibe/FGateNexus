import { defineEventHandler } from "h3";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { createApiResponse } from "#shared/types";
import { ApiError, createErrorResponse } from "#shared/error";
import { StatusCodes } from "http-status-codes";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";
import { pluginBridge } from "~~/server/service/mcwsbridge/MCWSBridge";

export default defineEventHandler(async (event) => {
    try {
        const database = await getDatabase();
        const result = await database.select().from(servers);

        // 为每个服务器获取状态信息
        const serversWithStatus: ServerWithStatus[] = result.map((server) => {
            const connectionData = pluginBridge.connectionManager.getConnectionData(server.id);
            return {
                ...server,
                isOnline: connectionData ? true : false,
                supports_papi: connectionData?.supports_papi ?? null,
                supports_command: connectionData?.supports_command ?? null,
                player_count: connectionData?.player_count ?? null
            };
        });

        return createApiResponse(event, "获取服务器列表成功", StatusCodes.OK, serversWithStatus);
    } catch (err) {
        console.error("Database error:", err);
        return createErrorResponse(event, ApiError.database("获取服务器列表失败"));
    }
});
