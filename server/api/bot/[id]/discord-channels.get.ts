import { setTimeout as sleep } from "node:timers/promises";

import { DiscordBot } from "@koishijs/plugin-adapter-discord";
import { eq } from "drizzle-orm";
import { getRouterParam } from "h3";
import { StatusCodes } from "http-status-codes";
import { db } from "~~/server/db/client";
import { botTable } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";
import { createApiResponse } from "~~/shared/model";

import { BotAPI } from "#shared/model/bot/api";
import { PlatformType } from "#shared/model/bot/types";
import { ApiError, createErrorResponse } from "#shared/model/error";

interface GuildItem {
  id: string;
  name: string;
  avatar?: string;
}

interface ChannelItem {
  id: string;
  guildId?: string;
  name: string;
  type: "group" | "private";
  avatar?: string;
}

interface DiscordChannelsResponse {
  guilds: GuildItem[];
  channels: ChannelItem[];
  dms: ChannelItem[];
}

const TEXT_CHANNEL_TYPE = 0;
const DISCORD_GUILD_PAGE_SIZE = 200;

const toGuildAvatarUrl = (guildId: string, icon?: string) =>
  icon ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png` : undefined;

const createEmptyResponse = (): DiscordChannelsResponse => ({
  channels: [],
  dms: [],
  guilds: [],
});

const appendGuildChannels = async (
  bot: DiscordBot,
  response: DiscordChannelsResponse,
) => {
  let nextGuildId: string | undefined;
  do {
    const guildList = await bot.internal.getCurrentUserGuilds({
      after: nextGuildId,
      limit: DISCORD_GUILD_PAGE_SIZE,
    });
    for (const guild of guildList) {
      response.guilds.push({
        avatar: toGuildAvatarUrl(guild.id, guild.icon),
        id: guild.id,
        name: guild.name || `服务器 ${guild.id}`,
      });

      const channelList = await bot.internal.getGuildChannels(guild.id);
      for (const channel of channelList) {
        if (channel.type !== TEXT_CHANNEL_TYPE) {
          continue;
        }

        response.channels.push({
          guildId: guild.id,
          id: channel.id,
          name: channel.name ?? `频道 ${channel.id}`,
          type: "group",
        });
      }
    }

    nextGuildId =
      guildList.length === DISCORD_GUILD_PAGE_SIZE
        ? guildList.at(-1)?.id
        : undefined;
    // 等待 100ms 避免 Api 限速
    if (nextGuildId) {
      await sleep(100);
    }
  } while (nextGuildId);
};

export default cachedEventHandler(
  async (event) => {
    try {
      const botId = Number(getRouterParam(event, "id"));
      if (Number.isNaN(botId)) {
        const apiError = ApiError.validation("无效的 Bot ID");
        return createErrorResponse(event, apiError);
      }

      const botRecord = await db.query.botTable.findFirst({
        where: eq(botTable.id, botId),
      });

      if (!botRecord) {
        const apiError = ApiError.notFound("未能找到 Bot");
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

      const response = createEmptyResponse();
      await appendGuildChannels(bot, response);

      return createApiResponse(
        event,
        "获取 Discord 频道列表成功",
        StatusCodes.OK,
        BotAPI.DISCORD_CHANNELS.response.parse(response),
      );
    } catch (error) {
      console.error("[Discord Channels API Error]", error);
      const apiError = ApiError.internal("获取频道列表失败");
      return createErrorResponse(event, apiError);
    }
  },
  {
    getKey: (event) => event.path,
    maxAge: 10,
    swr: false,
  },
);
