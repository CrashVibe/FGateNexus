import z from "zod";

import type { ApiSchemaRegistry } from "..";

export const GeneralAPI = {
  PATCH: {
    description: "更新服务器基础信息",
    request: z.object({
      adapterId: z.number().nullish()
    }),
    response: z.object({})
  }
} satisfies ApiSchemaRegistry;
