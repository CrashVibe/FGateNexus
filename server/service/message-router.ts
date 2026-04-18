import type { Element, Session } from "koishi";
import { h } from "koishi";
import {
  getServerByIdWithAdapterAndTargets,
  getServersByAdapterIdWithTargets,
} from "~~/server/db/queries/server";
import type { ServerWithTargets } from "~~/server/db/queries/server";
import { renderMinecraftTextToImage } from "~~/server/utils/mc-image-render";
import {
  formatMCToPlatformMessage,
  formatPlatformToMCMessage,
  shouldForwardMessage,
} from "~~/shared/utils/chat-sync";

import { connectionManager } from "#server/service/mcwsbridge/connection-manager";

import type { BotConnection } from "./chatbridge";
import { chatBridge } from "./chatbridge";

/**
 * MC 聊天消息数据
 */
export interface MCChatMessage {
  playerName: string;
  playerUUID: string;
  message: string;
  timestamp: number;
}

/**
 * 处理来自 MC 的聊天消息，转发到对应的聊天平台
 */
export const handleMCMessage = async (
  serverId: number,
  mcMessage: MCChatMessage,
): Promise<void> => {
  try {
    const server = await getServerByIdWithAdapterAndTargets(serverId);

    if (!server?.adapter) {
      logger.warn(`服务器 ${serverId} 或其适配器未找到`);
      return;
    }

    const { chatSyncConfig } = server;
    if (!chatSyncConfig.mcToPlatformEnabled) {
      return;
    }
    if (!shouldForwardMessage(mcMessage.message, chatSyncConfig)) {
      return;
    }

    const botConnection = chatBridge.getConnectionData(server.adapter.id);
    if (!botConnection || !chatBridge.isOnline(server.adapter.id)) {
      logger.warn(`机器人 ${server.adapter.id} 未上线`);
      return;
    }

    const formattedMessage = formatMCToPlatformMessage(
      chatSyncConfig.mcToPlatformTemplate,
      {
        message: mcMessage.message,
        playerName: mcMessage.playerName,
        playerUUID: mcMessage.playerUUID,
        serverName: server.name,
        timestamp: mcMessage.timestamp,
      },
    );

    const enabledTargets = server.targets.filter(
      (t) => t.config.chatSyncConfigSchema.enabled,
    );
    await Promise.allSettled(
      enabledTargets.map(async (t) =>
        chatBridge.sendToTarget(
          botConnection,
          t.targetId,
          t.type,
          formattedMessage,
        ),
      ),
    );

    logger.info(
      `[消息路由] MC 消息已从服务器 ${serverId} 转发到 ${enabledTargets.length} 个目标`,
    );
  } catch (error) {
    logger.error(
      { error },
      `[消息路由] 处理来自服务器 ${serverId} 的 MC 消息时出错`,
    );
  }
};

type ServerSession = ReturnType<
  typeof connectionManager.getConnectionByServerId
>;

const handlePlatformCommand = async (
  connection: BotConnection,
  session: Session,
  server: ServerWithTargets,
  serverSession: ServerSession,
): Promise<boolean> => {
  const commandTarget = server.targets.find((t) => {
    const isMatch =
      t.type === "group"
        ? t.targetId === session.channelId
        : t.targetId === session.userId;
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
  const hasPermission = roles.some(
    (r) =>
      r.name &&
      commandTarget.config.CommandConfigSchema.permissions.includes(r.name),
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
  const resultText = `指令执行${success ? "成功" : "失败"}：\n${message}`;

  let messageToSend: string | Element = resultText;
  if (server.commandConfig.imageRender) {
    try {
      const imgBuffer = await renderMinecraftTextToImage(resultText);
      messageToSend = h.image(
        `data:image/png;base64,${imgBuffer.toString("base64")}`,
      );
    } catch (error) {
      logger.error(error, "渲染指令结果图片时出错，已回退为文本消息");
    }
  }

  await chatBridge.sendToTarget(
    connection,
    commandTarget.targetId,
    commandTarget.type,
    messageToSend,
  );
  return true;
};

const handlePlatformChatSync = (
  session: Session,
  server: ServerWithTargets,
  serverSession: ServerSession,
): void => {
  const { chatSyncConfig } = server;
  if (
    !chatSyncConfig.platformToMcEnabled ||
    !shouldForwardMessage(session.content!, chatSyncConfig)
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
      message: session.content!,
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
  connection: BotConnection,
  session: Session,
): Promise<void> => {
  if (session.content === undefined) {
    return;
  }

  try {
    const serversWithConfig = await getServersByAdapterIdWithTargets(
      connection.adapterID,
    );

    for (const server of serversWithConfig) {
      const serverSession = connectionManager.getConnectionByServerId(
        server.id,
      );

      // 1. 处理指令匹配
      const isCommandHandled = await handlePlatformCommand(
        connection,
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
