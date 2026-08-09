import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "../client";
import { playerEventTable, serverTable } from "../schema";

export interface PlayerEventInput {
  serverId: number;
  /** 如 "player.death" */
  type: string;
  playerUuid: string | null;
  /** 当时的名字快照 */
  playerName: string | null;
  /** 事件 payload，如 { message } */
  data: Record<string, unknown> | null;
  createdAt: Date;
}

export const insertPlayerEvent = async (
  input: PlayerEventInput,
): Promise<number> => {
  const [row] = await db
    .insert(playerEventTable)
    .values({
      createdAt: input.createdAt,
      data: input.data ?? undefined,
      playerName: input.playerName,
      playerUuid: input.playerUuid,
      serverId: input.serverId,
      type: input.type,
    })
    .returning({ id: playerEventTable.id });
  return row.id;
};

export interface EventLeaderboardEntry {
  playerUuid: string;
  /** 名字快照 */
  playerName: string | null;
  count: number;
  /** 最近一条该类事件的时间 */
  lastAt: Date;
  /** 最近一条该类事件的 payload */
  lastData: Record<string, unknown> | null;
}

/** 按 count 降序取 Top limit；窗口函数一次 join 取代逐玩家二次查询。serverId=null 为全服榜 */
export const getEventLeaderboard = async (
  serverId: number | null,
  type: string,
  since: Date,
  limit: number,
): Promise<EventLeaderboardEntry[]> => {
  const serverFilter =
    serverId === null ? undefined : eq(playerEventTable.serverId, serverId);

  const ranked = db
    .select({
      count: count().as("count"),
      playerUuid: playerEventTable.playerUuid,
    })
    .from(playerEventTable)
    .where(
      and(
        serverFilter,
        eq(playerEventTable.type, type),
        gte(playerEventTable.createdAt, since),
        isNotNull(playerEventTable.playerUuid),
      ),
    )
    .groupBy(playerEventTable.playerUuid)
    .orderBy(desc(count()))
    .limit(limit)
    .as("ranked");

  const latest = db
    .select({
      createdAt: playerEventTable.createdAt,
      data: playerEventTable.data,
      playerName: playerEventTable.playerName,
      playerUuid: playerEventTable.playerUuid,
      rn: sql<number>`row_number() over (partition by ${playerEventTable.playerUuid} order by ${playerEventTable.createdAt} desc)`.as(
        "rn",
      ),
    })
    .from(playerEventTable)
    .where(and(serverFilter, eq(playerEventTable.type, type)))
    .as("latest");

  const rows = await db
    .select({
      count: ranked.count,
      createdAt: latest.createdAt,
      data: latest.data,
      playerName: latest.playerName,
      playerUuid: ranked.playerUuid,
    })
    .from(ranked)
    .innerJoin(
      latest,
      and(eq(latest.playerUuid, ranked.playerUuid), eq(latest.rn, 1)),
    )
    .orderBy(desc(ranked.count));

  return rows.map((r) => ({
    count: r.count,
    lastAt: r.createdAt,
    lastData: r.data,
    playerName: r.playerName,
    playerUuid: r.playerUuid!,
  }));
};

export interface RecentEvent {
  id: number;
  type: string;
  serverId: number;
  serverName: string;
  playerName: string | null;
  data: Record<string, unknown> | null;
  createdAt: Date;
}

/** 跨全部服务器的最近事件，供首页事件流展示 */
export const getRecentEvents = async (limit: number): Promise<RecentEvent[]> =>
  await db
    .select({
      createdAt: playerEventTable.createdAt,
      data: playerEventTable.data,
      id: playerEventTable.id,
      playerName: playerEventTable.playerName,
      serverId: playerEventTable.serverId,
      serverName: serverTable.name,
      type: playerEventTable.type,
    })
    .from(playerEventTable)
    .innerJoin(serverTable, eq(serverTable.id, playerEventTable.serverId))
    .orderBy(desc(playerEventTable.createdAt))
    .limit(limit);

/** 按事件类型分组计数，供首页"今日事件"统计 */
export const getEventCountsSince = async (
  since: Date,
): Promise<Record<string, number>> => {
  const rows = await db
    .select({ count: count(), type: playerEventTable.type })
    .from(playerEventTable)
    .where(gte(playerEventTable.createdAt, since))
    .groupBy(playerEventTable.type);

  return Object.fromEntries(rows.map((r) => [r.type, r.count]));
};
