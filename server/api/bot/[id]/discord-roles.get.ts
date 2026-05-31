import { DiscordBot } from "@koishijs/plugin-adapter-discord";
import { eq } from "drizzle-orm";
import { defineEventHandler, getQuery } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { botTable } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";

import { createApiResponse } from "#shared/model";
import { BotAPI } from "#shared/model/bot/api";
import { PlatformType } from "#shared/model/bot/types";
import { ApiError, createErrorResponse } from "#shared/model/error";

export default defineEventHandler(async (event) => {
  try {
    const botId = Number(getRouterParam(event, "id"));
    if (Number.isNaN(botId)) {
      const apiError = ApiError.validation("无效的 Bot ID");
      return createErrorResponse(event, apiError);
    }

    const query = getQuery(event);
    const guildId = Array.isArray(query.guildId)
      ? query.guildId[0]
      : query.guildId;

    const parsed = BotAPI.DISCORD_ROLES.request.safeParse({ guildId });
    if (!parsed.success) {
      const apiError = ApiError.validation("无效的群组 ID");
      return createErrorResponse(event, apiError, parsed.error);
    }

    const botRecord = await db.query.botTable.findFirst({
      where: eq(botTable.id, botId),
    });

    if (!botRecord) {
      const apiError = ApiError.notFound("Bot 不存在");
      return createErrorResponse(event, apiError);
    }

    if (botRecord.platform !== PlatformType.Discord) {
      const apiError = ApiError.validation("Bot 类型不是 Discord");
      return createErrorResponse(event, apiError);
    }

    const botConnection = chatBridge.get(botId);
    if (!botConnection || !botConnection.isOnline()) {
      const apiError = ApiError.notFound("Bot 未上线或机器人未找到");
      return createErrorResponse(event, apiError);
    }

    const { bot } = botConnection;
    if (!(bot instanceof DiscordBot)) {
      const apiError = ApiError.internal("Bot 对应的机器人实例类型不匹配");
      return createErrorResponse(event, apiError);
    }

    const roles = await bot.internal.getGuildRoles(parsed.data.guildId);
    const response = roles.map((role) => ({
      label: role.name,
      value: role.id,
    }));
    return createApiResponse(
      event,
      "获取 Discord 权限组列表成功",
      StatusCodes.OK,
      BotAPI.DISCORD_ROLES.response.parse(response),
    );
  } catch (error) {
    logger.error(error, "获取 Discord 权限组列表失败");
    const apiError = ApiError.internal("获取 Discord 权限组列表失败");
    return createErrorResponse(event, apiError);
  }
});
