import { and, eq } from "drizzle-orm";
import type { Session } from "koishi";

import { db } from "#server/db/client";
import { socialAccountTable, targetTable } from "#server/db/schema";
import { isPlatformType } from "#shared/model/bot/types";

import type { PlatformSender } from "../../chatbridge/sender/types";
import type { BindingHandler, BindingTrigger } from "../types";
import { executeUnbind } from "../unbind-effects";

/**
 * 退群解绑处理器
 *
 * 成员退群时，自动解绑其名下玩家。
 */
export class GroupLeaveHandler implements BindingHandler {
  public readonly trigger: BindingTrigger = "group-leave";

  public async handle(
    connection: PlatformSender,
    session: Session,
  ): Promise<boolean> {
    const { platform, userId, guildId } = session;
    if (!isPlatformType(platform) || !userId || !guildId) {
      return false;
    }

    const serversWithBindingConfig = await db.query.targetTable.findMany({
      where: eq(targetTable.guildId, guildId),
      with: { server: true },
    });

    const matchingTargets = serversWithBindingConfig.filter(
      (entry) =>
        entry.server.botId === connection.botId &&
        entry.server.bindingConfig.allowGroupUnbind,
    );

    if (matchingTargets.length === 0) {
      return false;
    }

    const socialAccountRecord = await db.query.socialAccountTable.findFirst({
      where: and(
        eq(socialAccountTable.uid, userId),
        eq(socialAccountTable.platform, platform),
      ),
      with: { players: true },
    });
    if (!socialAccountRecord) {
      return false;
    }

    const [playerRecord] = socialAccountRecord.players;
    if (!playerRecord) {
      return false;
    }

    await Promise.all(
      matchingTargets.map(async (target) =>
        executeUnbind(
          connection,
          target,
          target.server,
          platform,
          userId,
          playerRecord.name,
        ),
      ),
    );
    return true;
  }
}
