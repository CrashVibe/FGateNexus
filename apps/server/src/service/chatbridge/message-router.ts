import type { Session } from "koishi";

import { getServersByBotIdWithTargets } from "#server/db/queries/server";
import type { ServerWithTargets } from "#server/db/queries/server";
import { connectionManager } from "#server/service/mcwsbridge/connection-manager";
import { logger } from "#server/utils/logger";
import {
  formatPlatformToMCMessage,
  shouldForwardMessage,
} from "#shared/utils/chat-sync";

import { chatBridge } from ".";
import type { PlatformSender } from "./sender/types";
import { elements_to_string } from "./utils";

type ServerSession = ReturnType<
  typeof connectionManager.getConnectionByServerId
>;

const handlePlatformCommand = async (
  session: Session,
  server: ServerWithTargets,
  serverSession: ServerSession,
): Promise<boolean> => {
  const commandTarget = server.targets.find((t) => {
    const isMatch =
      t.type === "group"
        ? t.channelId === session.channelId
        : t.channelId === session.userId;
    return (
      isMatch &&
      t.config.CommandConfigSchema.enabled &&
      session.content!.startsWith(t.config.CommandConfigSchema.prefix)
    );
  });

  if (!commandTarget) {
    return false;
  }

  const roles = session.event.member?.roles ?? [];
  const hasPermission =
    commandTarget.type === "private" ||
    roles.some(
      (r) =>
        r.id &&
        commandTarget.config.CommandConfigSchema.permissions.includes(r.id),
    );

  if (!hasPermission) {
    return false;
  }

  if (!serverSession) {
    logger.warn(`服务器 ${server.id} 没有活动的 MCWS 连接，无法执行指令`);
    return false;
  }

  const { prefix } = commandTarget.config.CommandConfigSchema;
  const { success, message } = await serverSession.executeCommand(
    session.content!.slice(prefix.length),
    server.commandConfig.imageRender,
  );

  await chatBridge.dispatch({
    payload: { message, success },
    serverId: server.id,
    timestamp: Date.now(),
    type: "execute.command",
  });

  return true;
};

const handlePlatformChatSync = (
  session: Session,
  server: ServerWithTargets,
  serverSession: ServerSession,
): void => {
  const { chatSyncConfig } = server;
  if (session.elements === undefined) {
    return;
  }
  const content = elements_to_string(session.elements);
  if (
    !chatSyncConfig.platformToMcEnabled ||
    !shouldForwardMessage(content, chatSyncConfig)
  ) {
    return;
  }

  if (!serverSession) {
    logger.warn(`服务器 ${server.id} 没有活动的 MCWS 连接，无法广播`);
    return;
  }

  if (!session.userId) {
    throw new Error("消息格式化时用户 ID 不存在");
  }

  const formattedMessage = formatPlatformToMCMessage(
    chatSyncConfig.platformToMcTemplate,
    {
      message: content,
      nickname: session.username,
      platform: session.platform,
      timestamp: session.timestamp,
      userId: session.userId,
    },
  );

  serverSession.broadcastMessageToServer(formattedMessage);
  logger.info(`[消息路由] 已将平台消息转发到 MC 服务器 ${server.id}`);
};

/**
 * 处理来自聊天平台的消息，转发到对应的 MC 服务器
 */
export const handlePlatformMessage = async (
  connection: PlatformSender,
  session: Session,
): Promise<void> => {
  if (session.content === undefined) {
    return;
  }

  try {
    const serversWithConfig = await getServersByBotIdWithTargets(
      connection.botId,
    );

    for (const server of serversWithConfig) {
      const serverSession = connectionManager.getConnectionByServerId(
        server.id,
      );

      // 1. 处理指令匹配
      const isCommandHandled = await handlePlatformCommand(
        session,
        server,
        serverSession,
      );
      if (isCommandHandled) {
        return;
      } // 阻断不处理

      // 2. 处理聊天消息同步
      handlePlatformChatSync(session, server, serverSession);
    }
  } catch (error) {
    logger.error(error, `[消息路由] 处理平台消息时出错：`);
  }
};
