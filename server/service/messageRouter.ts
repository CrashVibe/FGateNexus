import type { ChatSyncConfig } from "~~/shared/schemas/server/chatSync";
import type { BotConnection } from "./chatbridge/chatbridge";
import { chatBridge } from "./chatbridge/chatbridge";
import type { Session } from "koishi";
import { getDatabase } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { eq } from "drizzle-orm";
import { pluginBridge } from "./mcwsbridge/MCWSBridge";
import { formatMCToPlatformMessage, formatPlatformToMCMessage } from "~~/shared/utils/chatSync";

/**
 * MC聊天消息数据
 */
export interface MCChatMessage {
    playerName: string;
    playerUUID: string;
    message: string;
    timestamp: number;
}

/**
 * 消息路由服务
 * 负责处理MC服务器与聊天平台之间的双向消息路由
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
     * 处理来自MC的聊天消息，转发到对应的聊天平台
     */
    public async handleMCMessage(serverId: number, mcMessage: MCChatMessage): Promise<void> {
        try {
            const database = await getDatabase();
            const server = await database.query.servers.findFirst({
                where: eq(servers.id, serverId),
                with: {
                    adapter: true
                }
            });

            if (!server || !server.adapter) {
                console.warn(`服务器 ${serverId} 或其适配器未找到`);
                return;
            }

            const chatSyncConfig = server.chatSyncConfig;
            if (!chatSyncConfig.enabled || chatSyncConfig.targets.length === 0) {
                return;
            }

            // 过滤
            if (!chatSyncConfig.mcToPlatformEnabled) {
                return;
            }
            if (!this.shouldForwardMessage(mcMessage.message, chatSyncConfig)) {
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
                console.warn(`机器人 ${server.adapter.id} 未上线`);
                return;
            }

            const sendPromises = chatSyncConfig.targets
                .filter((target) => target.enabled)
                .map((target) => chatBridge.sendToTarget(botConnection, target.groupId, target.type, formattedMessage));

            await Promise.allSettled(sendPromises);

            console.info(`[消息路由] 已将 MC 消息从服务器 ${serverId} 转发到 ${chatSyncConfig.targets.length} 个目标`);
        } catch (error) {
            console.error(`[消息路由] 处理来自服务器 ${serverId} 的 MC 消息时出错：`, error);
        }
    }

    /**
     * 处理来自聊天平台的消息，转发到对应的MC服务器
     */
    public async handlePlatformMessage(connection: BotConnection, session: Session): Promise<void> {
        try {
            const database = await getDatabase();
            const serversWithConfig = await database.query.servers.findMany({
                where: eq(servers.adapterId, connection.adapterID)
            });

            for (const server of serversWithConfig) {
                const chatSyncConfig = server.chatSyncConfig;
                if (!chatSyncConfig.enabled) {
                    continue;
                }

                // 检查消息是否来自配置的目标群组
                const isTargetGroup = chatSyncConfig.targets.some(
                    (target) => target.enabled && target.groupId === session.channelId
                );

                if (!isTargetGroup) {
                    continue;
                }

                // 过滤
                if (!chatSyncConfig.platformToMcEnabled) {
                    continue;
                }
                if (!this.shouldForwardMessage(session.content || "", chatSyncConfig)) {
                    continue;
                }

                const formattedMessage = formatPlatformToMCMessage(chatSyncConfig.platformToMcTemplate, {
                    platform: session.platform,
                    nickname: session.username,
                    userId: (() => {
                        if (!session.userId) throw new Error("消息格式化时用户 ID 不存在");
                        return session.userId;
                    })(),
                    message: session.content || "",
                    timestamp: session.timestamp || Date.now()
                });

                await pluginBridge.broadcastMessageToServer(server.id, formattedMessage);

                console.info(`[消息路由] 已将平台消息转发到 MC 服务器 ${server.id}`);
            }
        } catch (error) {
            console.error(`[消息路由] 处理平台消息时出错：`, error);
        }
    }

    /**
     * 检查消息是否应该被转发
     */
    private shouldForwardMessage(message: string, config: ChatSyncConfig): boolean {
        const { filters, platformToMcEnabled } = config;

        // 消息长度
        if (message.length < filters.minMessageLength || message.length > filters.maxMessageLength) {
            return false;
        }

        // 黑名单关键词
        if (filters.blacklistKeywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()))) {
            return false;
        }

        return true;
    }
}

export const messageRouter = MessageRouter.getInstance();
