import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";
import { ServersAPI } from "#shared/model/server/servers";

export const PlayerAPI = {
  GETS: {
    description: "获取玩家信息",
    request: z.object({}),
    response: z.array(
      z.object({
        player: z.object({
          createdAt: z.coerce.date(),
          id: z.number(),
          ip: z.string().nullable(),
          name: z.string(),
          socialAccountId: z.number().nullable(),
          updatedAt: z.coerce.date(),
          uuid: z.string(),
        }),
        serversName: z.array(ServersAPI.GETS.response.element.shape.name),
        socialAccount: z
          .object({
            adapterType: z.string(),
            createdAt: z.coerce.date(),
            id: z.number(),
            nickname: z.string().nullable(),
            uid: z.string(),
            updatedAt: z.coerce.date(),
          })
          .nullable(),
      }),
    ),
  },
} satisfies ApiSchemaRegistry;
