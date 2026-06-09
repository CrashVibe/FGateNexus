import { z } from "zod";

import type RequestHandler from "#server/service/mcwsbridge/request-handler";
import type ServerSession from "#server/service/mcwsbridge/server-session";
import type { JsonRpcRequest } from "#server/service/mcwsbridge/types";
import { createJsonRpcRequestSchema } from "#server/service/mcwsbridge/types";
import { logger } from "#server/utils/logger";

import { chatBridge } from "../../chatbridge";

/**
 * 处理来自 MC 的聊天消息
 * @description 这是一个 notice（通知）
 */
class ChatMessageHandler implements RequestHandler {
  method = "chat.message";

  public readonly chatMessageSchema = createJsonRpcRequestSchema(
    z.object({
      message: z.string(),
      playerName: z.string(),
      playerUUID: z.string(),
      timestamp: z.number(),
    }),
  );

  public async handleRequest(
    request: JsonRpcRequest,
    session: ServerSession,
  ): Promise<void> {
    const result = this.chatMessageSchema.safeParse(request);
    const { serverId } = session;

    if (!result.success) {
      throw new Error("聊天消息参数无效", { cause: result.error });
    }
    const { playerName, playerUUID, message, timestamp } = result.data.params;

    try {
      // 转发消息到聊天平台
      await chatBridge.dispatch({
        payload: {
          message,
          playerName,
          playerUUID,
          timestamp,
        },
        serverId,
        timestamp,
        type: "player.chat",
      });

      logger.debug(
        `[ChatMessageHandler] 处理来自 ${playerName} 的聊天消息，服务器 ID: ${serverId}`,
      );
    } catch (error) {
      logger.error(error, "[ChatMessageHandler] 无法处理聊天消息");
    }
  }
}

export default ChatMessageHandler;
