import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";

import { db } from "#server/db/client";
import {
  getEventCountsSince,
  getEventLeaderboard,
  getRecentEvents,
} from "#server/db/queries/player-event";
import { getStatusHistory } from "#server/db/queries/server-status-history";
import {
  botTable,
  playerTable,
  serverTable,
  targetTable,
} from "#server/db/schema";
import { fail, guard, ok } from "#server/http/respond";
import { sseStream } from "#server/http/sse";
import { chatBridge } from "#server/service/chatbridge";
import { subscribeDashboardEvents } from "#server/service/dashboard/event-stream";
import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import type ServerSession from "#server/service/mcwsbridge/server-session";
import { getRelays, subscribeRelays } from "#server/service/relay-log";
import { DashboardAPI } from "#shared/model/dashboard";
import { ApiError } from "#shared/model/error";

const clampInt = (raw: string | undefined, fallback: number, max: number) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** 无能力/请求失败都返回 null，由调用方决定汇总时按 0 算还是展示为"—" */
const getOnlinePlayerCount = async (
  session: ServerSession | undefined,
): Promise<number | null> => {
  if (!session?.capabilities.players) {
    return null;
  }
  try {
    const players = await session.getPlayers();
    return players.length;
  } catch {
    return null;
  }
};

export const dashboardRouter = new Hono()
  .get(
    "/summary",
    guard("获取首页统计失败", async (c) => {
      const [servers, bots, [players], targets] = await Promise.all([
        db.select().from(serverTable),
        db.select().from(botTable),
        // count(列) 只数非空
        db
          .select({ bound: count(playerTable.socialAccountId), total: count() })
          .from(playerTable),
        db.select({ config: targetTable.config }).from(targetTable),
      ]);

      const onlineServerIds = servers
        .map((s) => s.id)
        .filter((id) => connectionManager.hasConnection(undefined, id));

      const onlinePlayerCounts = await Promise.all(
        onlineServerIds.map((id) =>
          getOnlinePlayerCount(connectionManager.getConnectionByServerId(id)),
        ),
      );

      const onlineBots = bots.filter((b) => chatBridge.get(b.id)?.isOnline());
      const eventCounts = await getEventCountsSince(startOfToday());

      return ok(
        c,
        "获取首页统计成功",
        StatusCodes.OK,
        DashboardAPI.SUMMARY.response.parse({
          bindings: { bound: players?.bound ?? 0, total: players?.total ?? 0 },
          bots: { online: onlineBots.length, total: bots.length },
          chatSyncTargets: targets.filter(
            (t) => t.config.chatSyncConfigSchema.enabled,
          ).length,
          eventsToday: {
            death: eventCounts["player.death"] ?? 0,
            join: eventCounts["player.join"] ?? 0,
            leave: eventCounts["player.leave"] ?? 0,
          },
          players: {
            online: onlinePlayerCounts.reduce(
              (sum: number, n) => sum + (n ?? 0),
              0,
            ),
          },
          servers: { online: onlineServerIds.length, total: servers.length },
        }),
      );
    }),
  )
  .get(
    "/servers",
    guard("获取服务器状态失败", async (c) => {
      const servers = await db.select().from(serverTable);
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const rows = await Promise.all(
        servers.map(async (s) => {
          const session = connectionManager.getConnectionByServerId(s.id);
          const onlinePlayers = await getOnlinePlayerCount(session);

          const history = await getStatusHistory(s.id, since, 30);
          const recentTps = history.map((sample) => ({
            t: sample.t,
            tps: sample.tps,
          }));

          return {
            id: s.id,
            isOnline: Boolean(session),
            name: s.name,
            onlinePlayers,
            recentTps,
            software: s.minecraft_software,
            version: s.minecraft_version,
          };
        }),
      );

      return ok(
        c,
        "获取服务器状态成功",
        StatusCodes.OK,
        DashboardAPI.SERVERS.response.parse(rows),
      );
    }),
  )
  .get(
    "/events",
    guard("获取最近事件失败", async (c) => {
      const limit = clampInt(c.req.query("limit"), 20, 100);
      const events = await getRecentEvents(limit);
      return ok(
        c,
        "获取最近事件成功",
        StatusCodes.OK,
        DashboardAPI.EVENTS.response.parse(events),
      );
    }),
  )
  .get(
    "/relays",
    guard("获取消息记录失败", async (c) => {
      const serverId = c.req.query("serverId");
      return await ok(
        c,
        "获取消息记录成功",
        StatusCodes.OK,
        getRelays(
          clampInt(c.req.query("limit"), 30, 200),
          serverId === undefined ? undefined : Number(serverId),
        ),
      );
    }),
  )
  .get("/relay-stream", (c) => sseStream(c, "relay", subscribeRelays, (e) => e))
  .get("/stream", (c) =>
    sseStream(c, "player-event", subscribeDashboardEvents, (event) =>
      DashboardAPI.EVENTS.response.element.parse(event),
    ),
  )
  .get(
    "/leaderboard",
    guard("获取排行榜失败", async (c) => {
      const limit = clampInt(c.req.query("limit"), 5, 50);
      const entries = await getEventLeaderboard(
        null,
        "player.death",
        startOfToday(),
        limit,
      );
      return ok(
        c,
        "获取排行榜成功",
        StatusCodes.OK,
        DashboardAPI.LEADERBOARD.response.parse(entries),
      );
    }),
  )
  .get(
    "/status-history",
    guard("获取状态趋势失败", async (c) => {
      const serverId = Number(c.req.query("serverId"));
      if (!Number.isInteger(serverId)) {
        return fail(c, ApiError.validation("无效服务器 ID"));
      }
      const server = await db.query.serverTable.findFirst({
        where: eq(serverTable.id, serverId),
      });
      if (!server) {
        return fail(c, ApiError.notFound("服务器不存在"));
      }
      const hours = clampInt(c.req.query("hours"), 24, 168);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const samples = await getStatusHistory(serverId, since, 500);
      return ok(
        c,
        "获取状态趋势成功",
        StatusCodes.OK,
        DashboardAPI.STATUS_HISTORY.response.parse({
          samples,
          serverId,
          serverName: server.name,
        }),
      );
    }),
  );
