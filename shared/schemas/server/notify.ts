import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

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
    death_notify_message: z.string().default("[死亡] {playerName} 因 {deathMessage} 死亡了"),

    targets: z
        .array(
            z.object({
                /**
                 * 目标群组/频道ID
                 */
                groupId: z.string(),

                /**
                 * 目标类型 (group: 群组, private: 私聊)
                 */
                type: z.enum(["group", "private"]).default("group"),

                /**
                 * 是否启用此目标
                 */
                enabled: z.boolean().default(true),

                /**
                 * 本地 ID
                 */
                id: z.uuid().default(() => uuidv4())
            })
        )
        .default([])
});

export type NotifyConfig = z.infer<typeof NotifyConfigSchema>;
export type NotifyTarget = NotifyConfig["targets"][number];
