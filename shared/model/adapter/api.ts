import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";
import { OneBotConfigSchema } from "#shared/model/adapter/schema/onebot.ts";

import { AdapterResponseSchema, AdapterType } from "./schema";

export const AdapterAPI = {
  GET: {
    description: "获取单个服务器适配器信息",
    request: z.void(),
    response: AdapterResponseSchema,
  },
  GETS: {
    description: "获取服务器适配器列表",
    request: z.void(),
    response: z.array(AdapterResponseSchema),
  },
  POST: {
    description: "新增适配器",
    request: z.object({
      config: OneBotConfigSchema,
      name: z
        .string()
        .min(0)
        .max(12, "适配器名称长度最多为 12 个字符")
        .default(""),
      type: z.enum(AdapterType),
    }),
    response: z.void(),
  },
  POSTTOGGLE: {
    description: "启用或禁用适配器",
    request: z.object({
      enabled: z.boolean(),
    }),
    response: z.void(),
  },
  PUT: {
    description: "更新适配器信息",
    request: z.object({
      config: OneBotConfigSchema,
      name: z
        .string()
        .min(0)
        .max(12, "适配器名称长度最多为 12 个字符")
        .default(""),
      type: z.enum(AdapterType),
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;
