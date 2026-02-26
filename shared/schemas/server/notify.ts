import { z } from "zod";

import type { ApiSchemaRegistry } from "..";

import { TargetConfigSchema } from "./target";

/**
 * 系统通知配置
 */
export const NotifyConfigSchema = z.object({
  /**
   * 玩家进出通知
   */
  player_notify: z.boolean().default(false),

  /**
   * 玩家进出时发送的消息
   */
  join_notify_message: z.string().default("[系统通知] {playerName} 加入了游戏"),

  /**
   * 玩家离开时发送的消息
   */
  leave_notify_message: z.string().default("[系统通知] {playerName} 离开了游戏"),

  /**
   * 玩家死亡通知
   */
  player_disappoint_notify: z.boolean().default(false),

  /**
   * 玩家死亡时发送的消息
   */
  death_notify_message: z.string().default("[死亡] {playerName} 因 {deathMessage} 死亡了")
});

export const NotifyAPI = {
  PATCH: {
    description: "更新服务器通知配置",
    request: z.object({
      notify: NotifyConfigSchema,
      targets: z.array(
        z.object({
          id: z.uuidv4(),
          config: TargetConfigSchema
        })
      )
    }),
    response: z.object({})
  }
} satisfies ApiSchemaRegistry;
