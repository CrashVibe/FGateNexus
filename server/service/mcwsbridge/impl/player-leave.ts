import type { Peer } from "crossws";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";
import { pluginBridge } from "~~/server/service/mcwsbridge/mcws-bridge";
import type { RequestHandler } from "~~/server/service/mcwsbridge/request-handler";
import { createJsonRpcRequestSchema } from "~~/server/service/mcwsbridge/types";
import type { JsonRpcRequest } from "~~/server/service/mcwsbridge/types";
import { renderLeaveMessage } from "~~/shared/utils/template/notify";

const playerLeaveSchema = createJsonRpcRequestSchema(
  z.object({
    playerName: z.string(),
  }),
);

export class PlayerLeaveHandler implements RequestHandler {
  method = "player.leave";

  async handleRequest(request: JsonRpcRequest, peer: Peer): Promise<void> {
    const result = playerLeaveSchema.safeParse(request);
    if (!result.success) {
      throw new Error("无效玩家离开参数", { cause: result.error });
    }
    const { playerName } = result.data.params;

    const serverID = pluginBridge.connectionManager.getServerId(peer);
    const server = await db.query.servers.findFirst({
      where: eq(servers.id, serverID),
      with: {
        targets: true,
      },
    });
    if (!server) {
      throw new Error("玩家离开时未找到服务器");
    }
    if (server.notifyConfig.player_notify && server.adapterId !== null) {
      const botConnection = chatBridge.getConnectionData(server.adapterId);
      if (!botConnection) {
        throw new Error("玩家离开时未找到聊天连接");
      }
      const formattedMessage = renderLeaveMessage(
        server.notifyConfig.leave_notify_message,
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
