import type { JsonRpcRequest } from "../types";
import type { AdapterInternal, Peer } from "crossws";

import { type MCChatMessage, messageRouter } from "../../messageRouter";
import { pluginBridge } from "../MCWSBridge";
import { RequestHandler } from "../RequestHandler";

/**
 * 处理来自 MC 的聊天消息
 * 这是一个 notice（通知）
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
      logger.warn({ requestParams: request.params }, "Invalid chat message params");
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

      logger.info(`[ChatMessageHandler] 处理来自 ${playerName} 的聊天消息，服务器 ID: ${serverId}`);
    } catch (error) {
      logger.error({ error }, "[ChatMessageHandler] 无法处理聊天消息");
    }
  }
}
