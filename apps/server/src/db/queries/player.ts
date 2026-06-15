import { and, count, desc, eq, gte } from "drizzle-orm";

import type { PlatformType } from "#shared/model/bot/types";

import { db } from "../client";
import { playerServerTable, playerTable, socialAccountTable } from "../schema";

export interface MinimalPlayer {
  name: string;
  uuid: string;
}

export interface PlayerSocialBinding {
  platform: string;
  uid: string;
  nickname: string | null;
  /** 即社交账号创建时间 */
  boundAt: Date;
}

export interface PlayerProfile {
  name: string;
  uuid: string;
  /** 未加入过该服为 null */
  firstJoinedAt: Date | null;
  /** 未绑定为 null */
  social: PlayerSocialBinding | null;
}

export const getKnownPlayers = async (
  serverId: number,
  limit: number,
): Promise<MinimalPlayer[]> =>
  db
    .select({ name: playerTable.name, uuid: playerTable.uuid })
    .from(playerServerTable)
    .innerJoin(playerTable, eq(playerServerTable.playerId, playerTable.id))
    .where(eq(playerServerTable.serverId, serverId))
    .limit(limit);

/** 玩家未知（uuid 无记录）时返回 null */
export const getPlayerProfile = async (
  uuid: string,
  serverId: number,
): Promise<PlayerProfile | null> => {
  const rows = await db
    .select({
      firstJoinedAt: playerServerTable.createdAt,
      name: playerTable.name,
      socialBoundAt: socialAccountTable.createdAt,
      socialNickname: socialAccountTable.nickname,
      socialPlatform: socialAccountTable.platform,
      socialUid: socialAccountTable.uid,
      uuid: playerTable.uuid,
    })
    .from(playerTable)
    .leftJoin(
      playerServerTable,
      and(
        eq(playerServerTable.playerId, playerTable.id),
        eq(playerServerTable.serverId, serverId),
      ),
    )
    .leftJoin(
      socialAccountTable,
      eq(socialAccountTable.id, playerTable.socialAccountId),
    )
    .where(eq(playerTable.uuid, uuid))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }
  return {
    firstJoinedAt: row.firstJoinedAt,
    name: row.name,
    social:
      row.socialPlatform && row.socialUid && row.socialBoundAt
        ? {
            boundAt: row.socialBoundAt,
            nickname: row.socialNickname,
            platform: row.socialPlatform,
            uid: row.socialUid,
          }
        : null,
    uuid: row.uuid,
  };
};

export interface RecentJoin {
  name: string;
  uuid: string;
  joinedAt: Date;
}

/** withinDays 给定时仅返回该天数内首次加入的玩家 */
export const getRecentJoins = async (
  serverId: number,
  limit: number,
  withinDays?: number,
): Promise<RecentJoin[]> => {
  const conditions = [eq(playerServerTable.serverId, serverId)];
  if (withinDays !== undefined) {
    const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
    conditions.push(gte(playerServerTable.createdAt, since));
  }
  return db
    .select({
      joinedAt: playerServerTable.createdAt,
      name: playerTable.name,
      uuid: playerTable.uuid,
    })
    .from(playerServerTable)
    .innerJoin(playerTable, eq(playerServerTable.playerId, playerTable.id))
    .where(and(...conditions))
    .orderBy(desc(playerServerTable.createdAt))
    .limit(limit);
};

export interface BindingPlatformCount {
  platform: string;
  count: number;
}

export interface BindingStats {
  total: number;
  bound: number;
  unbound: number;
  byPlatform: BindingPlatformCount[];
}

/** 已知 = player_server 有记录；已绑定 = socialAccountId 非空 */
export const getBindingStats = async (
  serverId: number,
): Promise<BindingStats> => {
  const [totalRow] = await db
    .select({ value: count() })
    .from(playerServerTable)
    .where(eq(playerServerTable.serverId, serverId));

  const platformRows = await db
    .select({ platform: socialAccountTable.platform, value: count() })
    .from(playerServerTable)
    .innerJoin(playerTable, eq(playerServerTable.playerId, playerTable.id))
    .innerJoin(
      socialAccountTable,
      eq(socialAccountTable.id, playerTable.socialAccountId),
    )
    .where(eq(playerServerTable.serverId, serverId))
    .groupBy(socialAccountTable.platform);

  const total = totalRow?.value ?? 0;
  const byPlatform = platformRows.map((r) => ({
    count: r.value,
    platform: r.platform,
  }));
  const bound = byPlatform.reduce((sum, p) => sum + p.count, 0);
  return { bound, byPlatform, total, unbound: total - bound };
};

/** platform + uid → social_account → player */
export const getBoundPlayer = async (
  platform: string,
  uid: string,
  serverId: number,
): Promise<MinimalPlayer | null> => {
  const rows = await db
    .select({ name: playerTable.name, uuid: playerTable.uuid })
    .from(socialAccountTable)
    .innerJoin(
      playerTable,
      eq(playerTable.socialAccountId, socialAccountTable.id),
    )
    .innerJoin(
      playerServerTable,
      and(
        eq(playerServerTable.playerId, playerTable.id),
        eq(playerServerTable.serverId, serverId),
      ),
    )
    .where(
      and(
        eq(socialAccountTable.platform, platform as PlatformType),
        eq(socialAccountTable.uid, uid),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};
