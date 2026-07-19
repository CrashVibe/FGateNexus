import { and, eq, isNull } from "drizzle-orm";
import type { Session } from "koishi";

import { db } from "#server/db/client";
import { targetTable } from "#server/db/schema";
import type { Target } from "#server/db/schema";
import { buildSystemNotifyEvent } from "#server/service/mcwsbridge/types";
import { logger } from "#server/utils/logger";
import {
  renderBindFail,
  renderBindRenameName,
  renderBindSuccess,
} from "#shared/utils/template/binding";

import type { PlatformSender } from "../../chatbridge/sender/types";
import { getConfig } from "../config";
import { bindAccount } from "../domain";
import type { PendingBindingStore } from "../pending-store";
import type { BindingHandler, BindingTrigger } from "../types";

/**
 * 绑定验证码处理器
 *
 * 匹配玩家在群内发送的验证码，完成账号绑定。
 */
export class BindCodeHandler implements BindingHandler {
  public readonly trigger: BindingTrigger = "message";

  private readonly store: PendingBindingStore;

  constructor(store: PendingBindingStore) {
    this.store = store;
  }

  public async handle(
    connection: PlatformSender,
    session: Session,
  ): Promise<boolean> {
    const bindings = this.store.getByBot(connection.botId);
    if (!bindings) {
      return false;
    }

    const { userId, channelId } = session;
    if (!userId || !channelId) {
      return false;
    }

    const results = await Promise.all(
      Array.from(bindings, async ([, binding]) => {
        if (binding.message !== session.content) {
          return false;
        }

        const target = await db.query.targetTable.findFirst({
          where: and(
            eq(targetTable.serverId, binding.serverID),
            eq(targetTable.channelId, channelId),
            session.guildId
              ? eq(targetTable.guildId, session.guildId)
              : isNull(targetTable.guildId),
          ),
          with: { server: true },
        });
        if (!target?.server) {
          return false;
        }

        const bindingConfig = await getConfig(binding.serverID);
        try {
          const updatedPlayer = await bindAccount({
            platform: connection.platformType,
            playerUID: binding.playerUID,
            socialNickname: session.username,
            socialUid: userId,
          });

          this.store.delete(
            connection.botId,
            binding.serverID,
            binding.playerUID,
          );

          // 改名不着急所以放在绑定成功之后
          await BindCodeHandler.performAutoRename(
            userId,
            updatedPlayer.name,
            session.username,
            connection,
            target,
            bindingConfig,
          );

          await connection.onNotify(
            buildSystemNotifyEvent(
              binding.serverID,
              renderBindSuccess(
                bindingConfig.bindSuccessMsg,
                binding.playerNickname,
              ),
            ),
            target,
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error({ errorMessage }, "无法处理绑定");
          await connection.onNotify(
            buildSystemNotifyEvent(
              binding.serverID,
              renderBindFail(
                bindingConfig.bindFailMsg,
                binding.playerNickname,
                errorMessage,
              ),
            ),
            target,
          );
        }
        return true;
      }),
    );
    return results.some(Boolean);
  }

  private static async performAutoRename(
    socialUid: string,
    playerName: string,
    socialNickname: string | null,
    connection: PlatformSender,
    target: Target,
    bindingConfig: Awaited<ReturnType<typeof getConfig>>,
  ): Promise<void> {
    if (!bindingConfig.autoRenameEnabled) {
      return;
    }

    const resolvedNickname = socialNickname?.trim() ?? socialUid;
    const newName = renderBindRenameName(bindingConfig.autoRenameNameTemplate, {
      platform: connection.platformType,
      playerName,
      socialNickname: resolvedNickname,
      socialUid,
    }).trim();

    if (newName.length === 0) {
      logger.error("自动改名失败：改名模板渲染结果为空");
      return;
    }

    try {
      await connection.setGroupCard(target, socialUid, newName);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error({ errorMessage }, "自动改名失败：调用群名片接口失败");
    }
  }
}
