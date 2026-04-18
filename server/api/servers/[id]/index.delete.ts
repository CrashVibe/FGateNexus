import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";

import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverID)) {
      const apiError = ApiError.validation("无效服务器 ID");
      return createErrorResponse(event, apiError);
    }
    const result = await db.query.servers.findFirst({
      where: (server, { eq: eqFn }) => eqFn(server.id, serverID),
    });
    if (!result) {
      const apiError = ApiError.notFound("服务器不存在");
      return createErrorResponse(event, apiError);
    }

    const deleteResult = await db
      .delete(servers)
      .where(eq(servers.id, serverID))
      .returning();

    if (deleteResult[0]) {
      const server_session =
        connectionManager.getConnectionByServerId(serverID);
      if (server_session) {
        connectionManager.removeConnection(server_session);
      }
      return createApiResponse(event, "删除服务器成功", StatusCodes.OK, {
        id: serverID,
      });
    }
    const apiError = ApiError.database("未能删除服务器");
    return createErrorResponse(event, apiError);
  } catch (error) {
    logger.error(error, "Database error");
    return createErrorResponse(event, ApiError.database("获取服务器列表失败"));
  }
});
