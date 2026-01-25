import { ApiError, createErrorResponse } from "#shared/error";
import { createApiResponse } from "#shared/types";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { StatusCodes } from "http-status-codes";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { pluginBridge } from "~~/server/service/mcwsbridge/MCWSBridge";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (isNaN(serverID)) {
      const apiError = ApiError.validation("无效服务器 ID");
      return createErrorResponse(event, apiError);
    }
    const database = await getDatabase();
    const result = await database.query.servers.findFirst({
      where: (server, { eq }) => eq(server.id, serverID)
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
    logger.error({ err }, "Database error");
    return createErrorResponse(event, ApiError.database("获取服务器列表失败"));
  }
});
