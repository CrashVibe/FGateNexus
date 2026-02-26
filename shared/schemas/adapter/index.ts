import type { adapters } from "~~/server/db/schema";

import z from "zod";

import type { ApiSchemaRegistry } from "..";

import { type OneBotConfig, OneBotConfigSchema } from "./onebot";

export const AdapterConfigSchema = OneBotConfigSchema;

export type AdapterConfig = OneBotConfig;

export type AdapterSchema = typeof adapters.$inferSelect;
export type AdapterWithStatus = z.infer<typeof AdapterAPI.GET.response>;
export type AdaptersWithStatus = z.infer<typeof AdapterAPI.GETS.response>;

export enum AdapterType {
  Onebot = "onebot"
}

const AdapterResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(AdapterType),
  enabled: z.boolean(),
  config: AdapterConfigSchema,
  isOnline: z.boolean()
});

export const AdapterAPI = {
  GETS: {
    description: "获取服务器适配器列表",
    request: z.object({}),
    response: z.array(AdapterResponseSchema)
  },
  GET: {
    description: "获取单个服务器适配器信息",
    request: z.object({}),
    response: AdapterResponseSchema
  },
  POST: {
    description: "新增适配器",
    request: z.object({
      name: z.string().min(0).max(12, "适配器名称长度最多为 12 个字符").default(""),
      type: z.enum(AdapterType),
      config: AdapterConfigSchema
    }),
    response: z.object({})
  },
  POSTTOGGLE: {
    description: "启用或禁用适配器",
    request: z.object({
      enabled: z.boolean()
    }),
    response: z.object({})
  },
  PUT: {
    description: "更新适配器信息",
    request: z.object({
      name: z.string().min(0).max(12, "适配器名称长度最多为 12 个字符").default(""),
      type: z.enum(AdapterType),
      config: AdapterConfigSchema
    }),
    response: z.object({})
  }
} satisfies ApiSchemaRegistry;
