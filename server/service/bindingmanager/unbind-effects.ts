import type { serverTable, Target } from "~~/server/db/schema";
import {
  renderUnbindFail,
  renderUnbindKick,
  renderUnbindSuccess,
} from "~~/shared/utils/template/binding";

import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { buildSystemNotifyEvent } from "#server/service/mcwsbridge/types";
import type { PlatformType } from "#shared/model/bot/types";

import type { PlatformSender } from "../chatbridge/sender/types";
import { unbindPlayer } from "./domain";

/**
 * 执行单个服务器的解绑副作用：更新数据库、踢出在线玩家并发送结果通知。
 *
 * 由指令解绑 `UnbindCommandHandler` 与退群解绑 `GroupLeaveHandler` 共用。
 */
export const executeUnbind = async (
  connection: PlatformSender,
  target: Target,
  server: typeof serverTable.$inferSelect,
  platform: PlatformType,
  userId: string,
  playerName: string,
): Promise<void> => {
  try {
    const { playerUUID, socialUID } = await unbindPlayer(
      platform,
      userId,
      playerName,
    );
    logger.info({ playerUUID, socialUID }, "玩家解绑成功");

    const serverSession = connectionManager.getConnectionByServerId(server.id);
    if (serverSession) {
      await serverSession.kickPlayer(
        playerUUID,
        renderUnbindKick(server.bindingConfig.unbindkickMsg, socialUID),
      );
    } else {
      logger.warn(`服务器 ${server.name} 不在线，无法踢出玩家 ${playerName}`);
    }
    await connection.onNotify(
      buildSystemNotifyEvent(
        server.id,
        renderUnbindSuccess(server.bindingConfig.unbindSuccessMsg, playerName),
      ),
      target,
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ errorMessage }, "无法处理解绑");
    await connection.onNotify(
      buildSystemNotifyEvent(
        server.id,
        renderUnbindFail(
          server.bindingConfig.unbindFailMsg,
          playerName,
          errorMessage,
        ),
      ),
      target,
    );
  }
};
