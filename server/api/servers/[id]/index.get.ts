import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { pluginBridge } from "~~/server/service/mcwsbridge/MCWSBridge";
import type { ServerWithStatus } from "~~/shared/schemas/server/servers";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (isNaN(serverID)) {
      const apiError = ApiError.validation("无效服务器 ID");
      return createErrorResponse(event, apiError);
    }
    const database = await getDatabase();
    const result = await database.query.servers.findFirst({
      where: (server, { eq }) => eq(server.id, serverID),
      with: {
        targets: true
      }
    });
    if (!result) {
      const apiError = ApiError.notFound("服务器不存在");
      return createErrorResponse(event, apiError);
    }

    const connectionData = pluginBridge.connectionManager.getConnectionData(result.id);
    const serversWithStatus: ServerWithStatus = {
      ...result,
      isOnline: !!connectionData,
      supports_papi: connectionData?.supports_papi ?? null,
      supports_command: connectionData?.supports_command ?? null,
      player_count: connectionData?.player_count ?? null
    };
    return createApiResponse(event, "获取服务器列表成功", StatusCodes.OK, serversWithStatus);
  } catch (err) {
    logger.error({ err }, "Database error");
    return createErrorResponse(event, ApiError.database("获取服务器列表失败"));
  }
});
