import { RequestHandler } from "../RequestHandler";
import type { JsonRpcRequest } from "../types";
import type { AdapterInternal, Peer } from "crossws";
import { pluginBridge } from "../MCWSBridge";
import { type MCChatMessage, messageRouter } from "../../messageRouter";

/**
 * 处理来自MC的聊天消息
 * 这是一个notice（通知）
 */
export class ChatMessageHandler extends RequestHandler {
    getMethod(): string {
        return "chat.message";
    }

    async handleRequest(request: JsonRpcRequest<MCChatMessage>, peer: Peer<AdapterInternal>): Promise<void> {
        const { playerName, playerUUID, message, timestamp } = request.params || {};

        if (
            typeof playerName !== "string" ||
            typeof playerUUID !== "string" ||
            typeof message !== "string" ||
            typeof timestamp !== "number"
        ) {
            console.warn("Invalid chat message params:", request.params);
            return;
        }

        try {
            const serverId = pluginBridge.connectionManager.getServerId(peer);

            // 转发消息到聊天平台
            await messageRouter.handleMCMessage(serverId, {
                playerName,
                playerUUID,
                message,
                timestamp
            });

            console.info(`[ChatMessageHandler] Processed chat message from ${playerName} on server ${serverId}`);
        } catch (error) {
            console.error("[ChatMessageHandler] Error processing chat message:", error);
        }
    }
}
