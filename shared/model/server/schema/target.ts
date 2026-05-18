import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { PlatformType } from "../../bot/types";

/**
 * 目标配置
 */
export const TargetConfigSchema = z.object({
  CommandConfigSchema: z
    .object({
      /**
       * 是否启用指令功能
       */
      enabled: z.boolean().default(false),

      /**
       * 权限
       * 当前 Bot 和对应目标的权限
       */
      permissions: z.array(z.string()).default([]),

      /**
       * 执行指令前缀
       */
      prefix: z.string().default("/"),
    })
    .default({
      enabled: false,
      permissions: [],
      prefix: "/",
    }),

  NotifyConfigSchema: z
    .object({
      /**
       * 玩家死亡通知
       */
      player_disappoint_notify: z.boolean().default(false),

      /**
       * 玩家进出通知
       */
      player_notify: z.boolean().default(false),
    })
    .default({
      player_disappoint_notify: false,
      player_notify: false,
    }),

  chatSyncConfigSchema: z
    .object({
      /**
       * 是否启用聊天同步
       */
      enabled: z.boolean().default(false),
    })
    .default({
      enabled: false,
    }),
});

export type TargetConfig = z.infer<typeof TargetConfigSchema>;
export type targetResponse = z.infer<typeof targetSchema>;

export const targetSchema = z.object({
  channelId: z.string().nonempty("会话 ID 不能为空"),
  config: TargetConfigSchema.default(TargetConfigSchema.parse({})),
  createdAt: z.coerce.date().default(() => new Date()),
  enabled: z.boolean().default(true),
  guildId: z.string().nullable(),
  id: z.string().default(() => uuidv4()),
  platform: z.enum(PlatformType),
  type: z.enum(["group", "private"]).default("group"),
  updatedAt: z.coerce.date().default(() => new Date()),
});

export const targetSchemaRequest = targetSchema.pick({
  channelId: true,
  enabled: true,
  guildId: true,
  type: true,
});

export type targetSchemaRequestType = z.infer<typeof targetSchemaRequest>;
