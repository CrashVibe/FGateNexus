import type { ApiSchemaRegistry } from "..";
import z from "zod";

export const GeneralAPI = {
  PATCH: {
    description: "更新服务器基础信息",
    request: z.object({
      adapterId: z.number().nullish()
    }),
    response: z.object({})
  }
} satisfies ApiSchemaRegistry;
