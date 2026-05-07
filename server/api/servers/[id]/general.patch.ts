import { eq } from "drizzle-orm";
import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { GeneralAPI } from "#shared/model/server/api";

export default defineEventHandler(async (event) => {
  try {
    const serverId = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverId)) {
      const apiError = ApiError.validation("参数错误：无效的服务器 ID");
      return createErrorResponse(event, apiError);
    }

    const parsed = GeneralAPI.PATCH.request.safeParse(await readBody(event));

    if (!parsed.success) {
      return createErrorResponse(
        event,
        ApiError.validation("参数错误"),
        parsed.error,
      );
    }

    const updatePayload: Partial<{
      adapterId: number | null;
      name: string;
      token: string;
    }> = {};

    if (parsed.data.adapterId !== undefined) {
      updatePayload.adapterId = parsed.data.adapterId ?? null;
    }

    if (parsed.data.name !== undefined) {
      updatePayload.name = parsed.data.name;
    }

    if (parsed.data.token !== undefined) {
      updatePayload.token = parsed.data.token;
    }

    if (Object.keys(updatePayload).length === 0) {
      return createApiResponse(event, "无需更新", StatusCodes.OK);
    }

    const result = await db
      .update(servers)
      .set(updatePayload)
      .where(eq(servers.id, serverId))
      .returning();

    if (result.length === 0) {
      const apiError = ApiError.database(
        "更新服务器基础信息失败：未能找到服务器",
      );
      return createErrorResponse(event, apiError);
    }

    return createApiResponse(event, "更新服务器基础信息成功", StatusCodes.OK);
  } catch (error) {
    logger.error(error, "更新服务器基础信息失败");
    const apiError = ApiError.internal("更新服务器基础信息失败");
    return createErrorResponse(event, apiError);
  }
});
