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
import { renderDeathMessage } from "~~/shared/utils/template/notify";

const playerDeathSchema = createJsonRpcRequestSchema(
  z.object({
    deathMessage: z.string().optional(),
    playerName: z.string(),
  }),
);

export class PlayerDeathHandler implements RequestHandler {
  method = "player.death";

  async handleRequest(request: JsonRpcRequest, peer: Peer): Promise<void> {
    const result = playerDeathSchema.safeParse(request);
    if (!result.success) {
      throw new Error("无效玩家死亡参数", { cause: result.error });
    }
    const { playerName, deathMessage } = result.data.params;

    const serverID = pluginBridge.connectionManager.getServerId(peer);
    const server = await db.query.servers.findFirst({
      where: eq(servers.id, serverID),
      with: {
        targets: true,
      },
    });
    if (!server) {
      throw new Error("玩家死亡时未找到服务器");
    }
    if (
      server.notifyConfig.player_disappoint_notify &&
      server.adapterId !== null
    ) {
      const botConnection = chatBridge.getConnectionData(server.adapterId);
      if (!botConnection) {
        throw new Error("玩家死亡时未找到聊天连接");
      }
      const formattedMessage = renderDeathMessage(
        server.notifyConfig.death_notify_message,
        playerName,
        deathMessage ?? "未知原因",
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
