import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { serverTable, targetTable } from "~~/server/db/schema";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { GeneralAPI } from "#shared/model/server/api";

export default defineEventHandler(async (event) => {
  try {
    const serverId = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverId)) {
      return createErrorResponse(
        event,
        ApiError.validation("参数错误：无效的服务器 ID"),
      );
    }

    const parsed = GeneralAPI.PATCH.request.safeParse(await readBody(event));
    if (!parsed.success) {
      return createErrorResponse(
        event,
        ApiError.validation("参数错误"),
        parsed.error,
      );
    }

    const { botId, name, token } = parsed.data;

    const updatePayload = Object.fromEntries(
      Object.entries({ botId: botId ?? null, name, token }).filter(
        ([, v]) => v !== undefined,
      ),
    );

    if (Object.keys(updatePayload).length === 0) {
      return createApiResponse(event, "无需更新", StatusCodes.OK);
    }

    if (botId !== undefined) {
      const existingServer = await db.query.serverTable.findFirst({
        where: eq(serverTable.id, serverId),
      });

      if (existingServer && existingServer.botId !== (botId ?? null)) {
        await db.delete(targetTable).where(eq(targetTable.serverId, serverId));
      }
    }

    const result = await db
      .update(serverTable)
      .set(updatePayload)
      .where(eq(serverTable.id, serverId))
      .returning();

    if (result.length === 0) {
      return createErrorResponse(
        event,
        ApiError.database("更新服务器基础信息失败：未能找到服务器"),
      );
    }

    return createApiResponse(event, "更新服务器基础信息成功", StatusCodes.OK);
  } catch (error) {
    logger.error(error, "更新服务器基础信息失败");
    return createErrorResponse(
      event,
      ApiError.internal("更新服务器基础信息失败"),
    );
  }
});
