import { z } from "zod";

import { chatBridge } from "#server/service/chatbridge";
import type RequestHandler from "#server/service/mcwsbridge/request-handler";
import type serverSession from "#server/service/mcwsbridge/server-session";
import type { JsonRpcRequest } from "#server/service/mcwsbridge/types";
import { createJsonRpcRequestSchema } from "#server/service/mcwsbridge/types";

class PlayerDeathHandler implements RequestHandler {
  method = "player.death";

  public readonly playerDeathSchema = createJsonRpcRequestSchema(
    z.object({
      deathMessage: z.string().nullable(),
      playerName: z.string(),
      playerUUID: z.string(),
      timestamp: z.number(),
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
    const { playerName, playerUUID, deathMessage, timestamp } =
      result.data.params;

    await chatBridge.dispatch({
      payload: {
        deathMessage,
        playerName,
        playerUUID,
        timestamp,
      },
      serverId: serverID,
      timestamp,
      type: "player.death",
    });
  }
}

export default PlayerDeathHandler;
