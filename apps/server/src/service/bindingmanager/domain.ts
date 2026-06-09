/**
 * 绑定操作区，大大的副作用
 */
import { and, eq, sql } from "drizzle-orm";

import { db } from "#server/db/client";
import { playerTable, socialAccountTable } from "#server/db/schema";
import type { PlatformType } from "#shared/model/bot/types";

/**
 * 将玩家绑定到社交账号（不存在则创建社交账号）
 *
 * @returns 更新后的玩家记录
 */
export const bindAccount = async (params: {
  socialUid: string;
  socialNickname: string | null;
  platform: PlatformType;
  playerUID: string;
}): Promise<typeof playerTable.$inferSelect> => {
  const { socialUid, socialNickname, platform, playerUID } = params;

  let socialAccountRecord = await db.query.socialAccountTable.findFirst({
    where: and(
      eq(socialAccountTable.uid, socialUid),
      eq(socialAccountTable.platform, platform),
    ),
  });

  if (!socialAccountRecord) {
    const [newAccount] = await db
      .insert(socialAccountTable)
      .values({
        nickname: socialNickname,
        platform,
        uid: socialUid,
      })
      .returning();
    if (!newAccount) {
      throw new Error(`社交账号 ${socialUid} 创建失败`);
    }
    socialAccountRecord = newAccount;
  }

  const [updatedPlayer] = await db
    .update(playerTable)
    .set({
      socialAccountId: socialAccountRecord.id,
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(playerTable.uuid, playerUID))
    .returning();

  if (!updatedPlayer) {
    throw new Error(`Player with UUID ${playerUID} not found`);
  }

  return updatedPlayer;
};

/**
 * 解除玩家与社交账号的绑定
 *
 * @returns 被解绑玩家的 UUID 与社交账号 UID
 */
export const unbindPlayer = async (
  platform: PlatformType,
  socialUid: string,
  playerName: string,
): Promise<{ playerUUID: string; socialUID: string }> => {
  const socialAccountRecord = await db.query.socialAccountTable.findFirst({
    where: and(
      eq(socialAccountTable.uid, socialUid),
      eq(socialAccountTable.platform, platform),
    ),
    with: { players: true },
  });

  if (!socialAccountRecord) {
    throw new Error("未找到关联的社交账号");
  }

  const playerRecord = socialAccountRecord.players.find(
    (p) => p.name === playerName,
  );
  if (!playerRecord) {
    throw new Error("未找到匹配的玩家");
  }

  await db
    .update(playerTable)
    .set({ socialAccountId: null, updatedAt: sql`(unixepoch())` })
    .where(eq(playerTable.id, playerRecord.id));

  return {
    playerUUID: playerRecord.uuid,
    socialUID: socialAccountRecord.uid,
  };
};
