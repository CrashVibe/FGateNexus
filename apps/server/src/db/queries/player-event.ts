import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";

import { db } from "../client";
import { playerEventTable } from "../schema";

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
): Promise<void> => {
  await db.insert(playerEventTable).values({
    createdAt: input.createdAt,
    data: input.data ?? undefined,
    playerName: input.playerName,
    playerUuid: input.playerUuid,
    serverId: input.serverId,
    type: input.type,
  });
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

/** 按 count 降序取 Top limit */
export const getEventLeaderboard = async (
  serverId: number,
  type: string,
  since: Date,
  limit: number,
): Promise<EventLeaderboardEntry[]> => {
  const ranked = await db
    .select({
      count: count(),
      playerUuid: playerEventTable.playerUuid,
    })
    .from(playerEventTable)
    .where(
      and(
        eq(playerEventTable.serverId, serverId),
        eq(playerEventTable.type, type),
        gte(playerEventTable.createdAt, since),
        isNotNull(playerEventTable.playerUuid),
      ),
    )
    .groupBy(playerEventTable.playerUuid)
    .orderBy(desc(count()))
    .limit(limit);

  const entries: EventLeaderboardEntry[] = [];
  for (const r of ranked) {
    if (!r.playerUuid) {
      continue;
    }
    // 该玩家最近一条同类事件
    const [latest] = await db
      .select({
        createdAt: playerEventTable.createdAt,
        data: playerEventTable.data,
        playerName: playerEventTable.playerName,
      })
      .from(playerEventTable)
      .where(
        and(
          eq(playerEventTable.serverId, serverId),
          eq(playerEventTable.type, type),
          eq(playerEventTable.playerUuid, r.playerUuid),
        ),
      )
      .orderBy(desc(playerEventTable.createdAt))
      .limit(1);
    entries.push({
      count: r.count,
      lastAt: latest?.createdAt ?? since,
      lastData: latest?.data ?? null,
      playerName: latest?.playerName ?? null,
      playerUuid: r.playerUuid,
    });
  }
  return entries;
};
