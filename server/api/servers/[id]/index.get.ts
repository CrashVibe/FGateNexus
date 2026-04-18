import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";

import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { ServersAPI } from "#shared/model/server/servers";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverID)) {
      const apiError = ApiError.validation("无效服务器 ID");
      return createErrorResponse(event, apiError);
    }
    const result = await db.query.servers.findFirst({
      where: (server, { eq }) => eq(server.id, serverID),
      with: {
        targets: true,
      },
    });
    if (!result) {
      const apiError = ApiError.notFound("服务器不存在");
      return createErrorResponse(event, apiError);
    }

    const connection = connectionManager.getConnectionByServerId(result.id);
    return createApiResponse(
      event,
      "获取服务器列表成功",
      StatusCodes.OK,
      ServersAPI.GET.response.parse({
        ...result,
        isOnline: !!connection,
        supports_command: connection?.supports_command ?? null,
        supports_papi: connection?.supports_papi ?? null,
      }),
    );
  } catch (error) {
    logger.error(error, "Database error");
    return createErrorResponse(event, ApiError.database("获取服务器列表失败"));
  }
});
