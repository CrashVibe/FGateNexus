import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";

import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { ServersAPI } from "#shared/model/server/servers";

export default defineEventHandler(async (event) => {
  try {
    const result = await db.query.servers.findMany({
      with: {
        targets: true,
      },
    });

    // 为每个服务器获取状态信息
    const serversWithStatus = ServersAPI.GETS.response.parse(
      result.map((server) => {
        const connection = connectionManager.getConnectionByServerId(server.id);
        return {
          ...server,
          isOnline: !!connection,
          supports_command: connection?.supports_command ?? null,
          supports_papi: connection?.supports_papi ?? null,
        };
      }),
    );

    return createApiResponse(
      event,
      "获取服务器列表成功",
      StatusCodes.OK,
      serversWithStatus,
    );
  } catch (error) {
    logger.error(error, "Database error");
    return createErrorResponse(event, ApiError.database("获取服务器列表失败"));
  }
});
