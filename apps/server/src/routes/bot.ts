import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import type { z } from "zod";

import { db } from "#server/db/client";
import { botTable } from "#server/db/schema";
import { fail, guard, idParam, ok, parseBody } from "#server/http/respond";
import { chatBridge } from "#server/service/chatbridge";
import { forgetLastEvent, getLastEvent } from "#server/service/diagnostics";
import { clearServerCache } from "#server/service/server-cache";
import { BotAPI } from "#shared/model/bot/api";
import { PlatformConfigSchemas } from "#shared/model/bot/schema";
import { ApiError } from "#shared/model/error";

const onlineSender = (c: Context) => {
  const sender = chatBridge.get(idParam(c));
  if (!sender?.isOnline()) {
    throw ApiError.notFound("Bot 未上线或机器人未找到");
  }
  return sender;
};

export const botRouter = new Hono()
  .use(async (c, next) => {
    await next();
    if (c.req.method !== "GET") {
      clearServerCache();
    }
  })
  .get(
    "/",
    guard("获取 Bot 列表失败", async (c) => {
      const result = await db.select().from(botTable);
      const botsWithStatus: z.infer<typeof BotAPI.GETS.response> = result.map(
        (bot) => ({
          ...bot,
          isOnline: chatBridge.get(bot.id)?.isOnline() ?? false,
          lastEvent: getLastEvent("bot", bot.id),
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
      const data = await parseBody(
        c,
        BotAPI.POST.request,
        "添加 Bot 失败：配置无效",
      );
      const config = PlatformConfigSchemas[data.platform].safeParse(
        data.config,
      );
      if (!config.success) {
        return fail(
          c,
          ApiError.validation("添加 Bot 失败：配置与平台不匹配"),
          config.error,
        );
      }
      const [created] = await db
        .insert(botTable)
        .values({
          config: config.data,
          name: data.name ?? "",
          platform: data.platform,
        })
        .returning({ id: botTable.id });
      if (!created) {
        return fail(c, ApiError.database("添加 Bot 失败：未能插入数据"));
      }
      await chatBridge.syncBot(created.id);
      return ok(c, "添加 Bot 成功", StatusCodes.CREATED);
    }),
  )
  .get(
    "/:id",
    guard("获取 Bot 详情失败", async (c) => {
      const botId = idParam(c);
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
          lastEvent: getLastEvent("bot", bot.id),
        }),
      );
    }),
  )
  .put(
    "/:id",
    guard("更新 Bot 失败", async (c) => {
      const id = idParam(c);
      const data = await parseBody(
        c,
        BotAPI.PUT.request,
        "更新 Bot 失败：配置无效",
      );
      const existing = await db.query.botTable.findFirst({
        where: eq(botTable.id, id),
      });
      if (!existing) {
        return fail(c, ApiError.notFound("Bot 不存在"));
      }
      const config = PlatformConfigSchemas[existing.platform].safeParse(
        data.config,
      );
      if (!config.success) {
        return fail(
          c,
          ApiError.validation("更新 Bot 失败：配置与平台不匹配"),
          config.error,
        );
      }
      await db
        .update(botTable)
        .set({ config: config.data, name: data.name })
        .where(eq(botTable.id, id));
      await chatBridge.syncBot(id);
      return ok(c, "更新 Bot 成功", StatusCodes.OK);
    }),
  )
  .delete(
    "/:id",
    guard("删除 Bot 失败", async (c) => {
      const botId = idParam(c);
      const result = await db
        .delete(botTable)
        .where(eq(botTable.id, botId))
        .returning({ id: botTable.id });
      if (result.length === 0) {
        return fail(c, ApiError.notFound("Bot 不存在"));
      }
      await chatBridge.syncBot(botId);
      forgetLastEvent("bot", botId);
      return ok(c, "删除 Bot 成功", StatusCodes.OK);
    }),
  )
  .post(
    "/:id/toggle",
    guard("开关 Bot 失败", async (c) => {
      const botId = idParam(c);
      const data = await parseBody(
        c,
        BotAPI.POSTTOGGLE.request,
        "开关 Bot 失败：配置无效",
      );
      const result = await db
        .update(botTable)
        .set({ enabled: data.enabled })
        .where(eq(botTable.id, botId))
        .returning({ id: botTable.id });
      if (result.length === 0) {
        return fail(c, ApiError.notFound("Bot 不存在"));
      }
      await chatBridge.syncBot(botId);
      return ok(c, "开关 Bot 成功", StatusCodes.OK);
    }),
  )
  .get(
    "/:id/channels",
    guard("获取频道列表失败", async (c) =>
      ok(
        c,
        "获取频道列表成功",
        StatusCodes.OK,
        await onlineSender(c).listChannels(),
      ),
    ),
  )
  .get(
    "/:id/roles",
    guard("获取权限组列表失败", async (c) => {
      const parsed = BotAPI.ROLES.request.safeParse({
        guildId: c.req.query("guildId"),
      });
      if (!parsed.success) {
        return fail(c, ApiError.validation("无效的群组 ID"), parsed.error);
      }
      const sender = onlineSender(c);
      if (!sender.listRoles) {
        return fail(c, ApiError.badRequest("该平台没有权限组"));
      }
      return ok(
        c,
        "获取权限组列表成功",
        StatusCodes.OK,
        await sender.listRoles(parsed.data.guildId),
      );
    }),
  );
