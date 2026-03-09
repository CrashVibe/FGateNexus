import type { Peer } from "crossws";
import { z } from "zod";
import { pluginBridge } from "~~/server/service/mcwsbridge/mcws-bridge";
import type { RequestHandler } from "~~/server/service/mcwsbridge/request-handler";
import { createJsonRpcRequestSchema } from "~~/server/service/mcwsbridge/types";
import type { JsonRpcRequest } from "~~/server/service/mcwsbridge/types";
import { handleMCMessage } from "~~/server/service/message-router";

const chatMessageSchema = createJsonRpcRequestSchema(
  z.object({
    message: z.string(),
    playerName: z.string(),
    playerUUID: z.string(),
    timestamp: z.number(),
  }),
);

/**
 * 处理来自 MC 的聊天消息
 * @description 这是一个 notice（通知）
 */
export class ChatMessageHandler implements RequestHandler {
  method = "chat.message";

  public async handleRequest(
    request: JsonRpcRequest,
    peer: Peer,
  ): Promise<void> {
    const result = chatMessageSchema.safeParse(request);
    if (!result.success) {
      throw new Error("聊天消息参数无效", { cause: result.error });
    }
    const { playerName, playerUUID, message, timestamp } = result.data.params;

    try {
      const serverId = pluginBridge.connectionManager.getServerId(peer);

      // 转发消息到聊天平台
      await handleMCMessage(serverId, {
        message,
        playerName,
        playerUUID,
        timestamp,
      });

      logger.info(
        `[ChatMessageHandler] 处理来自 ${playerName} 的聊天消息，服务器 ID: ${serverId}`,
      );
    } catch (error) {
      logger.error(error, "[ChatMessageHandler] 无法处理聊天消息");
    }
  }
}
