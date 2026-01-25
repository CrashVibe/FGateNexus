import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "~~/server/db/client";
import { targets } from "~~/server/db/schema";
import { ApiError, createErrorResponse } from "~~/shared/error";
import { bulkCreateSchema } from "~~/shared/schemas/server/target";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverID)) return createErrorResponse(event, ApiError.validation("无效服务器 ID"));

    const body = await readBody(event);
    const parsed = bulkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(event, ApiError.validation("请求体格式不正确"));
    }

    const db = await getDatabase();

    const serverExists = await db.query.servers.findFirst({
      where: (s, { eq }) => eq(s.id, serverID)
    });
    if (!serverExists) {
      return createErrorResponse(event, ApiError.notFound("服务器不存在"));
    }

    const nowValues = parsed.data.map((p) => ({
      id: uuidv4(),
      serverId: serverID,
      targetId: p.targetId,
      type: p.type,
      enabled: p.enabled,
      config: getDefaultTargetConfig()
    }));

    const inserted = await db.insert(targets).values(nowValues).returning();

    return createApiResponse(event, "批量创建目标成功", StatusCodes.CREATED, inserted);
  } catch (err) {
    logger.error({ err }, "Database error");
    return createErrorResponse(event, ApiError.database("批量创建目标失败"));
  }
});
