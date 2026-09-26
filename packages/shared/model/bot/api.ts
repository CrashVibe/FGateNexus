import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";

import { PlatformResponseSchema, PlatformSchema } from "./schema";
import { PlatformType } from "./types";

const ChannelItemSchema = z.object({
  avatar: z.string().optional(),
  id: z.string(),
  name: z.string(),
  type: z.enum(["group", "private"]),
});

const OnebotChannelsSchema = z.array(ChannelItemSchema);

const DiscordChannelsSchema = z.object({
  channels: z.array(
    ChannelItemSchema.extend({
      guildId: z.string().optional(),
    }),
  ),
  dms: z.array(
    ChannelItemSchema.extend({
      guildId: z.string().optional(),
    }),
  ),
  guilds: z.array(
    z.object({
      avatar: z.string().optional(),
      id: z.string(),
      name: z.string(),
    }),
  ),
});

export const BotAPI = {
  DISCORD_CHANNELS: {
    description: "分组频道列表（Discord / KOOK：服务器和频道）",
    request: z.void(),
    response: DiscordChannelsSchema,
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
  ONEBOT_CHANNELS: {
    description: "扁平频道列表（OneBot / Milky：群和私聊）",
    request: z.void(),
    response: OnebotChannelsSchema,
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
  ROLES: {
    description: "获取群组权限组列表（Discord / KOOK）",
    request: z.object({
      guildId: z.string().nonempty("群组 ID 不能为空"),
    }),
    response: z.array(z.object({ label: z.string(), value: z.string() })),
  },
} satisfies ApiSchemaRegistry;

export type BotWithStatus = z.infer<typeof BotAPI.GET.response>;
export type BotsWithStatus = z.infer<typeof BotAPI.GETS.response>;
