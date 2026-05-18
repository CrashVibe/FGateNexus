import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";

import { PlatformResponseSchema, PlatformSchema } from "./schema";
import { PlatformType } from "./types";

export const BotAPI = {
  DISCORD_ROLES: {
    description: "获取 Discord 机器人群组权限列表",
    request: z.object({
      guildId: z.string().nonempty("群组 ID 不能为空"),
    }),
    response: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    ),
  },
  GET: {
    description: "获取单个服务器机器人信息",
    request: z.void(),
    response: PlatformResponseSchema,
  },
  GETS: {
    description: "获取服务器机器人列表",
    request: z.void(),
    response: z.array(PlatformResponseSchema),
  },
  POST: {
    description: "新增机器人",
    request: z.object({
      config: PlatformSchema,
      name: z
        .string()
        .min(0)
        .max(12, "机器人名称长度最多为 12 个字符")
        .default(""),
      platform: z.enum(PlatformType),
    }),
    response: z.void(),
  },
  POSTTOGGLE: {
    description: "启用或禁用机器人",
    request: z.object({
      enabled: z.boolean(),
    }),
    response: z.void(),
  },
  PUT: {
    description: "更新机器人信息",
    request: z.object({
      config: PlatformSchema,
      name: z
        .string()
        .min(0)
        .max(12, "机器人名称长度最多为 12 个字符")
        .default(""),
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;

export type BotWithStatus = z.infer<typeof BotAPI.GET.response>;
export type BotsWithStatus = z.infer<typeof BotAPI.GETS.response>;
