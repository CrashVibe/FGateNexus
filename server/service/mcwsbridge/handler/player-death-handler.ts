import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~~/server/db/client";
import { servers } from "~~/server/db/schema";
import { chatBridge } from "~~/server/service/chatbridge";
import type RequestHandler from "~~/server/service/mcwsbridge/request-handler";
import type { JsonRpcRequest } from "~~/server/service/mcwsbridge/types";
import { createJsonRpcRequestSchema } from "~~/server/service/mcwsbridge/types";
import { renderDeathMessage } from "~~/shared/utils/template/notify";

import type serverSession from "#server/service/mcwsbridge/server-session";

class PlayerDeathHandler implements RequestHandler {
  method = "player.death";

  public readonly playerDeathSchema = createJsonRpcRequestSchema(
    z.object({
      deathMessage: z.string().optional(),
      playerName: z.string(),
    }),
  );

  async handleRequest(
    request: JsonRpcRequest,
    session: serverSession,
  ): Promise<void> {
    const result = this.playerDeathSchema.safeParse(request);
    const serverID = session.serverId;

    if (!result.success) {
      throw new Error("无效玩家死亡参数", { cause: result.error });
    }
    const { playerName, deathMessage } = result.data.params;

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

export default PlayerDeathHandler;
