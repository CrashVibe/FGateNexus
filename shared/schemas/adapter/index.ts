import { z } from "zod";
import type { adapters } from "~~/server/db/schema";

import type { ApiSchemaRegistry } from "#shared/schemas";

import { OneBotConfigSchema } from "./onebot";
import type { OneBotConfig } from "./onebot";

export const AdapterConfigSchema = OneBotConfigSchema;

export type AdapterConfig = OneBotConfig;

export type AdapterSchema = typeof adapters.$inferSelect;
export type AdapterWithStatus = z.infer<typeof AdapterAPI.GET.response>;
export type AdaptersWithStatus = z.infer<typeof AdapterAPI.GETS.response>;

export enum AdapterType {
  Onebot = "onebot",
}

const AdapterResponseSchema = z.object({
  config: AdapterConfigSchema,
  enabled: z.boolean(),
  id: z.number(),
  isOnline: z.boolean(),
  name: z.string(),
  type: z.enum(AdapterType),
});

export const AdapterAPI = {
  GET: {
    description: "获取单个服务器适配器信息",
    request: z.object({}),
    response: AdapterResponseSchema,
  },
  GETS: {
    description: "获取服务器适配器列表",
    request: z.object({}),
    response: z.array(AdapterResponseSchema),
  },
  POST: {
    description: "新增适配器",
    request: z.object({
      config: AdapterConfigSchema,
      name: z
        .string()
        .min(0)
        .max(12, "适配器名称长度最多为 12 个字符")
        .default(""),
      type: z.enum(AdapterType),
    }),
    response: z.object({}),
  },
  POSTTOGGLE: {
    description: "启用或禁用适配器",
    request: z.object({
      enabled: z.boolean(),
    }),
    response: z.object({}),
  },
  PUT: {
    description: "更新适配器信息",
    request: z.object({
      config: AdapterConfigSchema,
      name: z
        .string()
        .min(0)
        .max(12, "适配器名称长度最多为 12 个字符")
        .default(""),
      type: z.enum(AdapterType),
    }),
    response: z.object({}),
  },
} satisfies ApiSchemaRegistry;
