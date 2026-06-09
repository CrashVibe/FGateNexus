import { z } from "zod";

import { chatBridge } from "#server/service/chatbridge";
import type RequestHandler from "#server/service/mcwsbridge/request-handler";
import type ServerSession from "#server/service/mcwsbridge/server-session";
import type { JsonRpcRequest } from "#server/service/mcwsbridge/types";
import { createJsonRpcRequestSchema } from "#server/service/mcwsbridge/types";

class PlayerLeaveHandler implements RequestHandler {
  method = "player.leave";

  public readonly playerLeaveSchema = createJsonRpcRequestSchema(
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
    const result = this.playerLeaveSchema.safeParse(request);
    const serverID = session.serverId;

    if (!result.success) {
      throw new Error("无效玩家离开参数", { cause: result.error });
    }
    const { playerName } = result.data.params;

    await chatBridge.dispatch({
      payload: {
        playerName,
        playerUUID: result.data.params.playerUUID,
        timestamp: result.data.params.timestamp,
      },
      serverId: serverID,
      timestamp: result.data.params.timestamp,
      type: "player.leave",
    });
  }
}

export default PlayerLeaveHandler;
