import { z } from "zod";

import { chatBridge } from "#server/service/chatbridge";
import type RequestHandler from "#server/service/mcwsbridge/request-handler";
import type { MCEventPayloadMap } from "#server/service/mcwsbridge/types";
import { createJsonRpcRequestSchema } from "#server/service/mcwsbridge/types";

import PlayerLoginHandler from "./player-login-handler";

const player = {
  playerName: z.string(),
  playerUUID: z.string(),
  timestamp: z.number(),
};

type Forwarded =
  | "player.chat"
  | "player.death"
  | "player.join"
  | "player.leave";

/** MC 通知原样转给聊天平台 */
const forward = <T extends Forwarded>(
  method: string,
  type: T,
  params: z.ZodType<MCEventPayloadMap[T]>,
): RequestHandler => {
  const schema = createJsonRpcRequestSchema(params);
  return {
    handleRequest: async (request, session) => {
      const result = schema.safeParse(request);
      if (!result.success) {
        throw new Error(`${method} 参数无效`, { cause: result.error });
      }
      const payload = result.data.params as MCEventPayloadMap[T];
      await chatBridge.dispatch({
        payload,
        serverId: session.serverId,
        timestamp: payload.timestamp,
        type,
      });
    },
    method,
  };
};

export const createHandlers = (): RequestHandler[] => [
  new PlayerLoginHandler(),
  forward(
    "chat.message",
    "player.chat",
    z.object({ ...player, message: z.string() }),
  ),
  forward("player.join", "player.join", z.object(player)),
  forward("player.leave", "player.leave", z.object(player)),
  forward(
    "player.death",
    "player.death",
    z.object({ ...player, deathMessage: z.string().nullable() }),
  ),
];
