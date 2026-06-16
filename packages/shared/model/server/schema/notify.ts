import { z } from "zod";

/**
 * 系统通知配置
 */
export const NotifyConfigSchema = z.object({
  /**
   * 玩家死亡时发送的消息
   */
  death_notify_message: z
    .string()
    .default("[死亡] {playerName} 因 {deathMessage} 死亡了"),

  /**
   * 玩家进出时发送的消息
   */
  join_notify_message: z.string().default("[系统通知] {playerName} 加入了游戏"),

  /**
   * 玩家离开时发送的消息
   */
  leave_notify_message: z
    .string()
    .default("[系统通知] {playerName} 离开了游戏"),
});

export type NotifyConfig = z.infer<typeof NotifyConfigSchema>;
