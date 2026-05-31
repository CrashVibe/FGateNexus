import { defineEventHandler, readBody } from "h3";
import { StatusCodes } from "http-status-codes";
import { v4 as uuidv4 } from "uuid";
import { db } from "~~/server/db/client";
import { targetTable } from "~~/server/db/schema";
import { TargetConfigSchema } from "~~/shared/model/server/schema/target";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { TargetAPI } from "#shared/model/server/api";

export default defineEventHandler(async (event) => {
  try {
    const serverID = Number(getRouterParam(event, "id"));
    if (Number.isNaN(serverID)) {
      return createErrorResponse(event, ApiError.validation("无效服务器 ID"));
    }

    const parsed = TargetAPI.POST.request.safeParse(await readBody(event));
    if (!parsed.success) {
      return createErrorResponse(
        event,
        ApiError.validation("请求体格式不正确"),
        parsed.error,
      );
    }

    const serverExists = await db.query.serverTable.findFirst({
      where: (s, { eq }) => eq(s.id, serverID),
      with: {
        bot: true,
      },
    });

    if (!serverExists || serverExists.bot === null) {
      return createErrorResponse(event, ApiError.notFound("服务器不存在"));
    }

    const { bot } = serverExists;

    const nowValues = parsed.data.map((p) => ({
      channelId: p.channelId,
      config: TargetConfigSchema.parse({}),
      guildId: p.guildId,
      id: uuidv4(),
      platform: bot.platform,
      serverId: serverID,
      type: p.type,
    }));

    const inserted = await db.insert(targetTable).values(nowValues).returning();

    return createApiResponse(
      event,
      "批量创建目标成功",
      StatusCodes.CREATED,
      TargetAPI.POST.response.parse(inserted),
    );
  } catch (error) {
    logger.error(error, "批量创建目标失败");
    return createErrorResponse(event, ApiError.internal("批量创建目标失败"));
  }
});
