import { eq } from "drizzle-orm";
import type { Session } from "koishi";

import { db } from "#server/db/client";
import { targetTable } from "#server/db/schema";
import { isPlatformType } from "#shared/model/bot/types";

import type { PlatformSender } from "../../chatbridge/sender/types";
import type { BindingHandler, BindingTrigger } from "../types";
import { executeUnbind } from "../unbind-effects";

/**
 * 解绑指令处理器
 *
 * 匹配以解绑前缀开头的群消息，解绑指定玩家。
 */
export class UnbindCommandHandler implements BindingHandler {
  public readonly trigger: BindingTrigger = "message";

  public async handle(
    connection: PlatformSender,
    session: Session,
  ): Promise<boolean> {
    const { platform, userId, channelId } = session;
    if (!isPlatformType(platform) || !userId || !channelId) {
      return false;
    }

    const targets = await db.query.targetTable.findMany({
      where: eq(targetTable.channelId, channelId),
      with: { server: true },
    });

    const unbindTasks = targets
      .filter(
        (entry) =>
          entry.server.botId === connection.botId &&
          entry.server.bindingConfig.allowUnbind &&
          session.content?.startsWith(
            entry.server.bindingConfig.unbindPrefix,
          ) === true,
      )
      .map((entry) => ({
        playerName: session
          .content!.slice(entry.server.bindingConfig.unbindPrefix.length)
          .trim(),
        target: entry,
      }))
      .filter(({ playerName }) => playerName.length > 0);

    if (unbindTasks.length === 0) {
      return false;
    }

    await Promise.all(
      unbindTasks.map(async ({ target, playerName }) => {
        await executeUnbind(
          connection,
          target,
          target.server,
          platform,
          userId,
          playerName,
        );
      }),
    );
    return true;
  }
}
