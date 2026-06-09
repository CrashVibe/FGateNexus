import { setTimeout as sleep } from "node:timers/promises";

import { DiscordBot } from "@koishijs/plugin-adapter-discord";
import { OneBot } from "@mrlingxd/koishi-plugin-adapter-onebot";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import type { z } from "zod";

import { db } from "#server/db/client";
import { botTable } from "#server/db/schema";
import { fail, guard, ok, readJson } from "#server/http/respond";
import { chatBridge } from "#server/service/chatbridge";
import { BotAPI } from "#shared/model/bot/api";
import { PlatformType } from "#shared/model/bot/types";
import { ApiError } from "#shared/model/error";

const TEXT_CHANNEL_TYPE = 0;
const DISCORD_GUILD_PAGE_SIZE = 200;

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

const toGuildAvatarUrl = (guildId: string, icon?: string) =>
  icon ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png` : undefined;

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
    if (nextGuildId) {
      await sleep(100);
    }
  } while (nextGuildId);
};

// 频道列表 TTL 缓存（10 秒），避免每次渲染都远程调用 bot API
const CHANNEL_CACHE_TTL_MS = 10_000;
const channelCache = new Map<string, { data: unknown; expiresAt: number }>();

const getCachedChannels = <T>(key: string): T | undefined => {
  const entry = channelCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    channelCache.delete(key);
    return undefined;
  }
  return entry.data as T;
};

const setCachedChannels = (key: string, data: unknown): void => {
  channelCache.set(key, { data, expiresAt: Date.now() + CHANNEL_CACHE_TTL_MS });
};

export const botRouter = new Hono()
  .get(
    "/",
    guard("获取 Bot 列表失败", async (c) => {
      const result = await db.select().from(botTable);
      const botsWithStatus: z.infer<typeof BotAPI.GETS.response> = result.map(
        (bot) => ({
          ...bot,
          isOnline: chatBridge.get(bot.id)?.isOnline() ?? false,
        }),
      );
      return ok(
        c,
        "获取 Bot 列表成功",
        StatusCodes.OK,
        BotAPI.GETS.response.parse(botsWithStatus),
      );
    }),
  )
  .post(
    "/",
    guard("添加 Bot 失败", async (c) => {
      const parsed = BotAPI.POST.request.safeParse(await readJson(c));
      if (!parsed.success) {
        return fail(
          c,
          ApiError.validation("添加 Bot 失败：配置无效"),
          parsed.error,
        );
      }
      const result = await db
        .insert(botTable)
        .values({
          config: parsed.data.config,
          name: parsed.data.name ?? "",
          platform: parsed.data.platform,
        })
        .returning();
      if (result[0]) {
        chatBridge.addBot(
          result[0].id,
          parsed.data.platform,
          parsed.data.config,
        );
        return ok(c, "添加 Bot 成功", StatusCodes.CREATED);
      }
      return fail(c, ApiError.database("添加 Bot 失败：未能插入数据"));
    }),
  )
  .get(
    "/:id",
    guard("获取 Bot 详情失败", async (c) => {
      const botId = Number(c.req.param("id"));
      if (Number.isNaN(botId)) {
        return fail(c, ApiError.validation("无效的 Bot ID"));
      }
      const bot = await db.query.botTable.findFirst({
        where: eq(botTable.id, botId),
      });
      if (!bot) {
        return fail(c, ApiError.notFound("Bot 不存在"));
      }
      return ok(
        c,
        `获取 ${botId} Bot 成功`,
        StatusCodes.OK,
        BotAPI.GET.response.parse({
          ...bot,
          isOnline: chatBridge.get(bot.id)?.isOnline() ?? false,
        }),
      );
    }),
  )
  .put(
    "/:id",
    guard("更新 Bot 失败", async (c) => {
      const id = Number(c.req.param("id"));
      if (Number.isNaN(id)) {
        return fail(c, ApiError.validation("更新 Bot 失败：无效的 Bot ID"));
      }
      const parsed = BotAPI.PUT.request.safeParse(await readJson(c));
      if (!parsed.success) {
        return fail(
          c,
          ApiError.validation("更新 Bot 失败：配置无效"),
          parsed.error,
        );
      }
      const result = await db
        .update(botTable)
        .set({ config: parsed.data.config, name: parsed.data.name })
        .where(eq(botTable.id, id))
        .returning();
      if (result[0]) {
        if (chatBridge.get(id)) {
          chatBridge.updateConfig(id, parsed.data.config);
        }
        return ok(c, "更新 Bot 成功", StatusCodes.OK);
      }
      return fail(c, ApiError.notFound("Bot 不存在"));
    }),
  )
  .delete(
    "/:id",
    guard("删除 Bot 失败", async (c) => {
      const botId = Number(c.req.param("id"));
      if (Number.isNaN(botId)) {
        return fail(c, ApiError.validation("无效的 Bot ID"));
      }
      const result = await db
        .delete(botTable)
        .where(eq(botTable.id, botId))
        .returning();
      if (result[0]) {
        chatBridge.removeBot(botId);
        return ok(c, "删除 Bot 成功", StatusCodes.OK);
      }
      return fail(c, ApiError.notFound("Bot 不存在"));
    }),
  )
  .post(
    "/:id/toggle",
    guard("开关 Bot 失败", async (c) => {
      const botId = Number(c.req.param("id"));
      if (Number.isNaN(botId)) {
        return fail(c, ApiError.validation("开关 Bot 失败：无效的 Bot ID"));
      }
      const parsed = BotAPI.POSTTOGGLE.request.safeParse(await readJson(c));
      if (!parsed.success) {
        return fail(
          c,
          ApiError.validation("开关 Bot 失败：配置无效"),
          parsed.error,
        );
      }
      const result = await db
        .update(botTable)
        .set({ enabled: parsed.data.enabled })
        .where(eq(botTable.id, botId))
        .returning();
      if (result[0]) {
        if (parsed.data.enabled) {
          chatBridge.addBot(botId, result[0].platform, result[0].config);
        } else {
          chatBridge.removeBot(botId);
        }
        return ok(c, "开关 Bot 成功", StatusCodes.OK);
      }
      return fail(c, ApiError.notFound("Bot 不存在"));
    }),
  )
  .get(
    "/:id/discord-channels",
    guard("获取频道列表失败", async (c) => {
      const botId = Number(c.req.param("id"));
      if (Number.isNaN(botId)) {
        return fail(c, ApiError.validation("无效的 Bot ID"));
      }
      const botRecord = await db.query.botTable.findFirst({
        where: eq(botTable.id, botId),
      });
      if (!botRecord) {
        return fail(c, ApiError.notFound("未能找到 Bot"));
      }
      if (botRecord.platform !== PlatformType.Discord) {
        return fail(c, ApiError.validation("Bot 类型不是 Discord"));
      }
      const botConnection = chatBridge.get(botId);
      if (!botConnection?.isOnline()) {
        return fail(c, ApiError.notFound("Bot 未上线或机器人未找到"));
      }
      const { bot } = botConnection;
      if (!(bot instanceof DiscordBot)) {
        return fail(c, ApiError.internal("Bot 对应的机器人实例类型不匹配"));
      }
      const dcCacheKey = `dc:${botId}`;
      const dcCached =
        getCachedChannels<z.infer<typeof BotAPI.DISCORD_CHANNELS.response>>(
          dcCacheKey,
        );
      if (dcCached) {
        return ok(c, "获取 Discord 频道列表成功", StatusCodes.OK, dcCached);
      }
      const response: DiscordChannelsResponse = {
        channels: [],
        dms: [],
        guilds: [],
      };
      await appendGuildChannels(bot, response);
      const dcResult = BotAPI.DISCORD_CHANNELS.response.parse(response);
      setCachedChannels(dcCacheKey, dcResult);
      return ok(c, "获取 Discord 频道列表成功", StatusCodes.OK, dcResult);
    }),
  )
  .get(
    "/:id/discord-roles",
    guard("获取 Discord 权限组列表失败", async (c) => {
      const botId = Number(c.req.param("id"));
      if (Number.isNaN(botId)) {
        return fail(c, ApiError.validation("无效的 Bot ID"));
      }
      const parsed = BotAPI.DISCORD_ROLES.request.safeParse({
        guildId: c.req.query("guildId"),
      });
      if (!parsed.success) {
        return fail(c, ApiError.validation("无效的群组 ID"), parsed.error);
      }
      const botRecord = await db.query.botTable.findFirst({
        where: eq(botTable.id, botId),
      });
      if (!botRecord) {
        return fail(c, ApiError.notFound("Bot 不存在"));
      }
      if (botRecord.platform !== PlatformType.Discord) {
        return fail(c, ApiError.validation("Bot 类型不是 Discord"));
      }
      const botConnection = chatBridge.get(botId);
      if (!botConnection?.isOnline()) {
        return fail(c, ApiError.notFound("Bot 未上线或机器人未找到"));
      }
      const { bot } = botConnection;
      if (!(bot instanceof DiscordBot)) {
        return fail(c, ApiError.internal("Bot 对应的机器人实例类型不匹配"));
      }
      const drCacheKey = `dr:${botId}:${parsed.data.guildId}`;
      const drCached =
        getCachedChannels<z.infer<typeof BotAPI.DISCORD_ROLES.response>>(
          drCacheKey,
        );
      if (drCached) {
        return ok(c, "获取 Discord 权限组列表成功", StatusCodes.OK, drCached);
      }
      const roles = await bot.internal.getGuildRoles(parsed.data.guildId);
      const drResult = BotAPI.DISCORD_ROLES.response.parse(
        roles.map((role) => ({ label: role.name, value: role.id })),
      );
      setCachedChannels(drCacheKey, drResult);
      return ok(c, "获取 Discord 权限组列表成功", StatusCodes.OK, drResult);
    }),
  )
  .get(
    "/:id/onebot-channels",
    guard("获取频道列表失败", async (c) => {
      const botId = Number(c.req.param("id"));
      if (Number.isNaN(botId)) {
        return fail(c, ApiError.validation("无效的 Bot ID"));
      }
      const botRecord = await db.query.botTable.findFirst({
        where: eq(botTable.id, botId),
      });
      if (!botRecord) {
        return fail(c, ApiError.notFound("未能找到 Bot"));
      }
      if (botRecord.platform !== PlatformType.Onebot) {
        return fail(c, ApiError.validation("Bot 类型不是 OneBot"));
      }
      const botConnection = chatBridge.get(botId);
      if (!botConnection?.isOnline()) {
        return fail(c, ApiError.notFound("Bot 未上线或机器人未找到"));
      }
      const { bot } = botConnection;
      if (!(bot instanceof OneBot)) {
        return fail(c, ApiError.validation("Bot 类型不是 OneBot"));
      }
      const obCacheKey = `ob:${botId}`;
      const obCached = getCachedChannels<ChannelItem[]>(obCacheKey);
      if (obCached) {
        return ok(c, "获取 OneBot 频道列表成功", StatusCodes.OK, obCached);
      }
      const channels: ChannelItem[] = [];
      for (const group of await bot.internal.getGroupList()) {
        channels.push({
          avatar: `https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/640`,
          id: String(group.group_id),
          name: group.group_name || `群 ${group.group_id}`,
          type: "group",
        });
      }
      for (const friend of await bot.internal.getFriendList()) {
        channels.push({
          avatar: `http://q.qlogo.cn/headimg_dl?dst_uin=${friend.user_id}&spec=640&img_type=jpg`,
          id: String(friend.user_id),
          name: friend.nickname || friend.remark || `用户 ${friend.user_id}`,
          type: "private",
        });
      }
      setCachedChannels(obCacheKey, channels);
      return ok(c, "获取 OneBot 频道列表成功", StatusCodes.OK, channels);
    }),
  );
