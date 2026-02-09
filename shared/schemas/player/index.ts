import type { ApiSchemaRegistry } from "..";
import z from "zod";

import { ServersAPI } from "../server/servers";

export const PlayerAPI = {
  GETS: {
    description: "获取玩家信息",
    response: z.array(
      z.object({
        player: z.object({
          id: z.number(),
          uuid: z.string(),
          name: z.string(),
          ip: z.string().nullable(),
          socialAccountId: z.number().nullable(),
          createdAt: z.coerce.date(),
          updatedAt: z.coerce.date()
        }),
        socialAccount: z
          .object({
            id: z.number(),
            nickname: z.string().nullable(),
            uid: z.string(),
            adapterType: z.string(),
            createdAt: z.coerce.date(),
            updatedAt: z.coerce.date()
          })
          .nullable(),
        servers: ServersAPI.GETS.response
      })
    ),
    request: z.object({})
  }
} satisfies ApiSchemaRegistry;
