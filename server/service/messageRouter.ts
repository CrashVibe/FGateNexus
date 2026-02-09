import type { BotConnection } from "./chatbridge/chatbridge";
import { eq } from "drizzle-orm";
import type { Session } from "koishi";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { formatMCToPlatformMessage, formatPlatformToMCMessage, shouldForwardMessage } from "~~/shared/utils/chatSync";

import { chatBridge } from "./chatbridge/chatbridge";
import { pluginBridge } from "./mcwsbridge/MCWSBridge";

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
 * 消息路由服务
 * 负责处理 MC 服务器与聊天平台之间的双向消息路由
 */
class MessageRouter {
  private static instance: MessageRouter;

  private constructor() {}

  public static getInstance(): MessageRouter {
    if (!MessageRouter.instance) {
      MessageRouter.instance = new MessageRouter();
    }
    return MessageRouter.instance;
  }

  /**
   * 处理来自 MC 的聊天消息，转发到对应的聊天平台
   */
  public async handleMCMessage(serverId: number, mcMessage: MCChatMessage): Promise<void> {
    try {
      const database = await getDatabase();
      const server = await database.query.servers.findFirst({
        where: eq(servers.id, serverId),
        with: {
          adapter: true,
          targets: true
        }
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

      const formattedMessage = formatMCToPlatformMessage(chatSyncConfig.mcToPlatformTemplate, {
        playerName: mcMessage.playerName,
        playerUUID: mcMessage.playerUUID,
        message: mcMessage.message,
        serverName: server.name,
        timestamp: mcMessage.timestamp
      });

      const botConnection = chatBridge.getConnectionData(server.adapter.id);
      if (!botConnection || !chatBridge.isOnline(server.adapter.id)) {
        logger.warn(`机器人 ${server.adapter.id} 未上线`);
        return;
      }

      const sendPromises = server.targets
        .filter((target) => target.config.chatSyncConfigSchema.enabled)
        .map((target) => chatBridge.sendToTarget(botConnection, target.targetId, target.type, formattedMessage));

      await Promise.allSettled(sendPromises);

      logger.info(`[消息路由] 已将 MC 消息从服务器 ${serverId} 转发到 ${sendPromises.length} 个目标`);
    } catch (error) {
      logger.error({ error }, `[消息路由] 处理来自服务器 ${serverId} 的 MC 消息时出错：`);
    }
  }

  /**
   * 处理来自聊天平台的消息，转发到对应的 MC 服务器
   */
  public async handlePlatformMessage(connection: BotConnection, session: Session): Promise<void> {
    try {
      const database = await getDatabase();
      const serversWithConfig = await database.query.servers.findMany({
        where: eq(servers.adapterId, connection.adapterID),
        with: {
          targets: true
        }
      });
      if (session.content === undefined) {
        return;
      }
      const tasks: Promise<unknown>[] = [];

      for (const server of serversWithConfig) {
        for (const target of server.targets) {
          if (!target.config.CommandConfigSchema.enabled) continue;
          if (target.type === "group" ? target.targetId !== session.channelId : target.targetId !== session.userId)
            continue;
          if (!session.content.startsWith(target.config.CommandConfigSchema.prefix)) continue;
          const role = session.event.member?.roles;
          if (!role || !role.some((r) => target.config.CommandConfigSchema.permissions.includes(r))) continue;

          const cmd = pluginBridge
            .executeCommand(server.id, session.content.slice(target.config.CommandConfigSchema.prefix.length))
            .then(({ success, message }) =>
              chatBridge.sendToTarget(
                connection,
                target.targetId,
                target.type,
                success ? `指令执行成功: ${message}` : `指令执行失败：${message}` // TODO: 图片渲染
              )
            );
          tasks.push(cmd);
          return; // 阻断
        }
        const { chatSyncConfig } = server;
        if (!chatSyncConfig.platformToMcEnabled) continue;
        if (!shouldForwardMessage(session.content, chatSyncConfig)) continue;

        const formattedMessage = formatPlatformToMCMessage(chatSyncConfig.platformToMcTemplate, {
          platform: session.platform,
          nickname: session.username,
          userId: (() => {
            if (!session.userId) throw new Error("消息格式化时用户 ID 不存在");
            return session.userId;
          })(),
          message: session.content,
          timestamp: session.timestamp
        });

        tasks.push(
          pluginBridge
            .broadcastMessageToServer(server.id, formattedMessage)
            .then(() => logger.info(`[消息路由] 已将平台消息转发到 MC 服务器 ${server.id}`))
        );
      }

      if (tasks.length) {
        await Promise.allSettled(tasks);
      }
    } catch (error) {
      logger.error({ error }, `[消息路由] 处理平台消息时出错：`);
    }
  }
}

export const messageRouter = MessageRouter.getInstance();
