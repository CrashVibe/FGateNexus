import { and, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { v4 as uuidv4 } from "uuid";

import { db } from "#server/db/client";
import type { Target } from "#server/db/schema";
import { serverTable, targetTable } from "#server/db/schema";
import { fail, guard, idParam, ok, parseBody } from "#server/http/respond";
import {
  forgetLastEvent,
  getLastEvent,
  noteLastEvent,
} from "#server/service/diagnostics";
import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { forgetRelays } from "#server/service/relay-log";
import { clearServerCache } from "#server/service/server-cache";
import en from "#shared/locales/en.json";
import { ApiError } from "#shared/model/error";
import {
  BindingAPI,
  ChatSyncAPI,
  CommandAPI,
  GeneralAPI,
  NotifyAPI,
  ServersAPI,
  TargetAPI,
  TargetConfigAPI,
} from "#shared/model/server/api";
import { BindingConfigSchema } from "#shared/model/server/schema/binding";
import { ChatSyncConfigSchema } from "#shared/model/server/schema/chat-sync";
import { CommandConfigSchema } from "#shared/model/server/schema/command";
import { NotifyConfigSchema } from "#shared/model/server/schema/notify";
import { TargetConfigSchema } from "#shared/model/server/schema/target";

/**
 * 事务：批量更新服务器下的目标配置。目标 ID 必须全部属于该服务器，否则抛 ApiError.validation。
 */
const updateTargetConfigs = (
  serverId: number,
  items: { id: string; config: Target["config"] }[],
): void => {
  db.transaction((tx) => {
    const ids = items.map((i) => i.id);
    const exists = tx
      .select()
      .from(targetTable)
      .where(
        and(eq(targetTable.serverId, serverId), inArray(targetTable.id, ids)),
      )
      .all();

    if (exists.length !== ids.length) {
      const okSet = new Set(exists.map((e) => e.id));
      const invalidIds = ids.filter((x) => !okSet.has(x));
      throw ApiError.validation(
        `存在与该服务器不匹配或不存在的目标 ID: ${invalidIds.join(", ")}`,
      );
    }

    for (const i of items) {
      tx.update(targetTable)
        .set({ config: i.config, updatedAt: sql`(unixepoch())` })
        .where(
          and(eq(targetTable.id, i.id), eq(targetTable.serverId, serverId)),
        )
        .run();
    }
  });
};

/** 不存在抛 404 */
const updateServer = (
  serverId: number,
  set: Partial<typeof serverTable.$inferInsert>,
): void => {
  const rows = db
    .update(serverTable)
    .set(set)
    .where(eq(serverTable.id, serverId))
    .returning({ id: serverTable.id })
    .all();
  if (rows.length === 0) {
    throw ApiError.notFound("服务器不存在");
  }
};

export const serversRouter = new Hono()
  .use(async (c, next) => {
    await next();
    if (c.req.method !== "GET") {
      clearServerCache();
    }
  })
  .get(
    "/",
    guard("获取服务器列表失败", async (c) => {
      const result = await db.query.serverTable.findMany({
        with: { targets: true },
      });
      const serversWithStatus = ServersAPI.GETS.response.parse(
        result.map((server) => {
          const connection = connectionManager.getConnectionByServerId(
            server.id,
          );
          return {
            ...server,
            isOnline: Boolean(connection),
            lastEvent: getLastEvent("server", server.id),
            supports_command: connection?.supports_command ?? null,
            supports_papi: connection?.supports_papi ?? null,
          };
        }),
      );
      return ok(c, "获取服务器列表成功", StatusCodes.OK, serversWithStatus);
    }),
  )
  .post(
    "/",
    guard("添加服务器失败", async (c) => {
      const data = await parseBody(
        c,
        ServersAPI.POST.request,
        "添加服务器失败",
      );
      // 英文界面建的服务器，默认模板也给英文（只翻顶层字符串字段）
      const localize = <T extends object>(config: T): T =>
        data.lang === "en"
          ? (Object.fromEntries(
              Object.entries(config).map(([k, v]) => [
                k,
                typeof v === "string"
                  ? ((en as Record<string, string>)[v] ?? v)
                  : v,
              ]),
            ) as T)
          : config;
      const [created] = await db
        .insert(serverTable)
        .values({
          bindingConfig: localize(BindingConfigSchema.parse({})),
          chatSyncConfig: localize(ChatSyncConfigSchema.parse({})),
          commandConfig: CommandConfigSchema.parse({}),
          name: data.servername,
          notifyConfig: localize(NotifyConfigSchema.parse({})),
          token: data.token,
        })
        .returning({ id: serverTable.id });
      return ok(c, "添加服务器成功", StatusCodes.CREATED, created);
    }),
  )
  .get(
    "/:id",
    guard("获取服务器详情失败", async (c) => {
      const serverID = idParam(c);
      const result = await db.query.serverTable.findFirst({
        where: eq(serverTable.id, serverID),
        with: { targets: true },
      });
      if (!result) {
        return fail(c, ApiError.notFound("服务器不存在"));
      }
      const connection = connectionManager.getConnectionByServerId(result.id);
      return ok(
        c,
        "获取服务器列表成功",
        StatusCodes.OK,
        ServersAPI.GET.response.parse({
          ...result,
          isOnline: Boolean(connection),
          lastEvent: getLastEvent("server", result.id),
          supports_command: connection?.supports_command ?? null,
          supports_papi: connection?.supports_papi ?? null,
        }),
      );
    }),
  )
  .delete(
    "/:id",
    guard("删除服务器失败", async (c) => {
      const serverID = idParam(c);
      const deleted = await db
        .delete(serverTable)
        .where(eq(serverTable.id, serverID))
        .returning({ id: serverTable.id });
      if (deleted.length === 0) {
        return fail(c, ApiError.notFound("服务器不存在"));
      }
      const session = connectionManager.getConnectionByServerId(serverID);
      if (session) {
        connectionManager.removeConnection(session);
      }
      forgetRelays(serverID);
      forgetLastEvent("server", serverID);
      return ok(c, "删除服务器成功", StatusCodes.OK, { id: serverID });
    }),
  )
  .patch(
    "/:id/general",
    guard("更新服务器基础信息失败", async (c) => {
      const serverId = idParam(c);
      const { botId, name, token } = await parseBody(
        c,
        GeneralAPI.PATCH.request,
        "参数错误",
      );
      const updatePayload = Object.fromEntries(
        Object.entries({ botId: botId ?? null, name, token }).filter(
          ([, v]) => v !== undefined,
        ),
      );
      if (Object.keys(updatePayload).length === 0) {
        return ok(c, "无需更新", StatusCodes.OK);
      }
      const existingServer = await db.query.serverTable.findFirst({
        where: eq(serverTable.id, serverId),
      });
      if (!existingServer) {
        return fail(c, ApiError.notFound("服务器不存在"));
      }
      // 换 bot 连带清群聊，得在同一事务里
      db.transaction((tx) => {
        if (botId !== undefined && existingServer.botId !== (botId ?? null)) {
          tx.delete(targetTable)
            .where(eq(targetTable.serverId, serverId))
            .run();
        }
        tx.update(serverTable)
          .set(updatePayload)
          .where(eq(serverTable.id, serverId))
          .run();
      });
      // 换了 Token：踢掉还拿着旧 Token 的连接
      const session =
        token === undefined || token === existingServer.token
          ? undefined
          : connectionManager.getConnectionByServerId(serverId);
      if (session) {
        connectionManager.removeConnection(session);
        noteLastEvent(
          "server",
          serverId,
          "Token 已更换，旧连接被踢下线",
          false,
        );
      }
      return ok(c, "更新服务器基础信息成功", StatusCodes.OK);
    }),
  )
  .patch(
    "/:id/binding",
    guard("更新服务器绑定配置失败", async (c) => {
      const serverID = idParam(c);
      const data = await parseBody(c, BindingAPI.PATCH.request, "参数错误");
      updateServer(serverID, { bindingConfig: data.config });
      return ok(c, "更新服务器绑定配置成功", StatusCodes.OK);
    }),
  )
  .patch(
    "/:id/chat-sync",
    guard("更新服务器聊天同步配置失败", async (c) => {
      const serverID = idParam(c);
      const data = await parseBody(c, ChatSyncAPI.PATCH.request, "参数错误");
      updateServer(serverID, { chatSyncConfig: data.chatsync });
      return ok(c, "更新服务器聊天同步配置成功", StatusCodes.OK);
    }),
  )
  .patch(
    "/:id/command",
    guard("更新服务器指令配置失败", async (c) => {
      const serverID = idParam(c);
      const data = await parseBody(c, CommandAPI.PATCH.request, "参数错误");
      updateServer(serverID, { commandConfig: data.command });
      return ok(c, "更新服务器指令配置成功", StatusCodes.OK);
    }),
  )
  .patch(
    "/:id/notify",
    guard("更新服务器通知配置失败", async (c) => {
      const serverId = idParam(c);
      const data = await parseBody(c, NotifyAPI.PATCH.request, "参数错误");
      updateServer(serverId, { notifyConfig: data.notify });
      return ok(c, "更新服务器通知配置成功", StatusCodes.OK);
    }),
  )
  .patch(
    "/:id/target-configs",
    guard("更新目标配置失败", async (c) => {
      const serverId = idParam(c);
      const data = await parseBody(
        c,
        TargetConfigAPI.PATCH.request,
        "参数错误",
      );
      updateTargetConfigs(serverId, data.items);
      return ok(c, "更新目标配置成功", StatusCodes.OK);
    }),
  )
  .get(
    "/:id/targets",
    guard("获取目标列表失败", async (c) => {
      const serverID = idParam(c);
      const result = await db.query.targetTable.findMany({
        where: eq(targetTable.serverId, serverID),
      });
      return ok(
        c,
        "获取服务器目标列表成功",
        StatusCodes.OK,
        TargetAPI.GETS.response.parse(result),
      );
    }),
  )
  .post(
    "/:id/targets",
    guard("批量创建目标失败", async (c) => {
      const serverID = idParam(c);
      const data = await parseBody(
        c,
        TargetAPI.POST.request,
        "请求体格式不正确",
      );
      const serverExists = await db.query.serverTable.findFirst({
        where: eq(serverTable.id, serverID),
        with: { bot: true },
      });
      if (!serverExists || serverExists.bot === null) {
        return fail(c, ApiError.notFound("服务器不存在"));
      }
      const { bot } = serverExists;
      const nowValues = data.map((p) => ({
        channelId: p.channelId,
        config: TargetConfigSchema.parse({}),
        guildId: p.guildId,
        id: uuidv4(),
        platform: bot.platform,
        serverId: serverID,
        type: p.type,
      }));
      const inserted = await db
        .insert(targetTable)
        .values(nowValues)
        .returning();
      return ok(
        c,
        "批量创建目标成功",
        StatusCodes.CREATED,
        TargetAPI.POST.response.parse(inserted),
      );
    }),
  )
  .patch(
    "/:id/targets",
    guard("批量更新失败", async (c) => {
      const serverID = idParam(c);
      const { items } = await parseBody(
        c,
        TargetAPI.PATCH.request,
        "请求体格式不正确",
      );
      if (items.length === 0) {
        return fail(c, ApiError.validation("更新项不能为空"));
      }
      const updatedRows = db.transaction((tx) =>
        items.flatMap(({ id, data }) =>
          tx
            .update(targetTable)
            .set({ ...data, updatedAt: sql`(unixepoch())` })
            .where(
              and(eq(targetTable.serverId, serverID), eq(targetTable.id, id)),
            )
            .returning()
            .all(),
        ),
      );
      if (updatedRows.length === 0) {
        return fail(c, ApiError.notFound("未匹配到任何目标"));
      }
      return ok(c, "批量更新成功", StatusCodes.OK, updatedRows);
    }),
  )
  .delete(
    "/:id/targets",
    guard("批量删除目标失败", async (c) => {
      const serverID = idParam(c);
      const data = await parseBody(
        c,
        TargetAPI.DELETE.request,
        "请求体格式不正确",
      );
      const deleted = await db
        .delete(targetTable)
        .where(
          and(
            eq(targetTable.serverId, serverID),
            inArray(targetTable.id, data.ids),
          ),
        )
        .returning();
      if (deleted.length === 0) {
        return fail(c, ApiError.notFound("未匹配到任何目标"));
      }
      return ok(
        c,
        "批量删除目标成功",
        StatusCodes.OK,
        TargetAPI.DELETE.response.parse(deleted),
      );
    }),
  );
