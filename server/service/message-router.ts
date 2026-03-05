import { eq } from "drizzle-orm";
import type { Session } from "koishi";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import {
  formatMCToPlatformMessage,
  formatPlatformToMCMessage,
  shouldForwardMessage,
} from "~~/shared/utils/chat-sync";

import type { BotConnection } from "./chatbridge";
import { chatBridge } from "./chatbridge";
import { pluginBridge } from "./mcwsbridge/mcws-bridge";

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
    const server = await db.query.servers.findFirst({
      where: eq(servers.id, serverId),
      with: {
        adapter: true,
        targets: true,
      },
    });

    if (!server || !server.adapter) {
      logger.warn(`服务器 ${serverId} 或其适配器未找到`);
      return;
    }
    const { chatSyncConfig } = server;

    // 过滤
    if (!chatSyncConfig.mcToPlatformEnabled) {
      return;
    }
    if (!shouldForwardMessage(mcMessage.message, chatSyncConfig)) {
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

    const botConnection = chatBridge.getConnectionData(server.adapter.id);
    if (!botConnection || !chatBridge.isOnline(server.adapter.id)) {
      logger.warn(`机器人 ${server.adapter.id} 未上线`);
      return;
    }

    const sendPromises = server.targets
      .filter((target) => target.config.chatSyncConfigSchema.enabled)
      .map(async (target) =>
        chatBridge.sendToTarget(
          botConnection,
          target.targetId,
          target.type,
          formattedMessage,
        ),
      );

    await Promise.allSettled(sendPromises);

    logger.info(
      `[消息路由] 已将 MC 消息从服务器 ${serverId} 转发到 ${sendPromises.length} 个目标`,
    );
  } catch (error) {
    logger.error(
      { error },
      `[消息路由] 处理来自服务器 ${serverId} 的 MC 消息时出错：`,
    );
  }
};

/**
 * 处理来自聊天平台的消息，转发到对应的 MC 服务器
 */
export const handlePlatformMessage = async (
  connection: BotConnection,
  session: Session,
): Promise<void> => {
  try {
    const serversWithConfig = await db.query.servers.findMany({
      where: eq(servers.adapterId, connection.adapterID),
      with: {
        targets: true,
      },
    });
    if (session.content === undefined) {
      return;
    }

    for (const server of serversWithConfig) {
      for (const target of server.targets) {
        if (!target.config.CommandConfigSchema.enabled) {
          continue;
        }
        if (
          target.type === "group"
            ? target.targetId !== session.channelId
            : target.targetId !== session.userId
        ) {
          continue;
        }
        if (
          !session.content.startsWith(target.config.CommandConfigSchema.prefix)
        ) {
          continue;
        }
        const role = session.event.member?.roles;
        if (
          !role ||
          !role.some((r) =>
            target.config.CommandConfigSchema.permissions.includes(r),
          )
        ) {
          continue;
        }

        const { success, message } = await pluginBridge.executeCommand(
          server.id,
          session.content.slice(
            target.config.CommandConfigSchema.prefix.length,
          ),
        );
        // NOTE: 图片渲染待实现
        await chatBridge.sendToTarget(
          connection,
          target.targetId,
          target.type,
          success ? `指令执行成功: ${message}` : `指令执行失败：${message}`,
        );
        // 阻断
        return;
      }
      const { chatSyncConfig } = server;
      if (!chatSyncConfig.platformToMcEnabled) {
        continue;
      }
      if (!shouldForwardMessage(session.content, chatSyncConfig)) {
        continue;
      }

      const formattedMessage = formatPlatformToMCMessage(
        chatSyncConfig.platformToMcTemplate,
        {
          message: session.content,
          nickname: session.username,
          platform: session.platform,
          timestamp: session.timestamp,
          userId: (() => {
            if (session.userId === undefined) {
              throw new Error("消息格式化时用户 ID 不存在");
            }
            return session.userId;
          })(),
        },
      );

      pluginBridge.broadcastMessageToServer(server.id, formattedMessage);
      logger.info(`[消息路由] 已将平台消息转发到 MC 服务器 ${server.id}`);
    }
  } catch (error) {
    logger.error({ error }, `[消息路由] 处理平台消息时出错：`);
  }
};
