import { z } from "zod";
import { chatBridge } from "~~/server/service/chatbridge";
import type RequestHandler from "~~/server/service/mcwsbridge/request-handler";
import type { JsonRpcRequest } from "~~/server/service/mcwsbridge/types";
import { createJsonRpcRequestSchema } from "~~/server/service/mcwsbridge/types";

import type ServerSession from "#server/service/mcwsbridge/server-session";

class PlayerJoinHandler implements RequestHandler {
  method = "player.join";

  public readonly playerJoinSchema = createJsonRpcRequestSchema(
    z.object({
      playerName: z.string(),
      playerUUID: z.string(),
      timestamp: z.number(),
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
    const { playerName, timestamp, playerUUID } = result.data.params;

    await chatBridge.dispatch({
      payload: {
        playerName,
        playerUUID,
        timestamp,
      },
      serverId: serverID,
      timestamp,
      type: "player.join",
    });
  }
}

export default PlayerJoinHandler;
