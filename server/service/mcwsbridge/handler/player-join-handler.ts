import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";
import type RequestHandler from "~~/server/service/mcwsbridge/request-handler";
import type { JsonRpcRequest } from "~~/server/service/mcwsbridge/types";
import { createJsonRpcRequestSchema } from "~~/server/service/mcwsbridge/types";
import { renderJoinMessage } from "~~/shared/utils/template/notify";

import type ServerSession from "#server/service/mcwsbridge/server-session";

class PlayerJoinHandler implements RequestHandler {
  method = "player.join";

  public readonly playerJoinSchema = createJsonRpcRequestSchema(
    z.object({
      playerName: z.string(),
    }),
  );

  async handleRequest(
    request: JsonRpcRequest,
    session: ServerSession,
  ): Promise<void> {
    const result = this.playerJoinSchema.safeParse(request);
    const serverID = session.serverId;

    if (!result.success) {
      throw new Error("无效玩家加入参数", { cause: result.error });
    }
    const { playerName } = result.data.params;

    const server = await db.query.servers.findFirst({
      where: eq(servers.id, serverID),
      with: {
        targets: true,
      },
    });
    if (!server) {
      throw new Error("玩家加入时未找到服务器");
    }
    if (server.notifyConfig.player_notify && server.adapterId !== null) {
      const botConnection = chatBridge.getConnectionData(server.adapterId);
      if (!botConnection) {
        throw new Error("玩家加入时未找到聊天连接");
      }
      const formattedMessage = renderJoinMessage(
        server.notifyConfig.join_notify_message,
        playerName,
      );
      for (const target of server.targets.filter(
        (t) => t.config.NotifyConfigSchema.enabled,
      )) {
        await chatBridge.sendToTarget(
          botConnection,
          target.targetId,
          target.type,
          formattedMessage,
        );
      }
    }
  }
}

export default PlayerJoinHandler;
