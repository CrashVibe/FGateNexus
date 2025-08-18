import { z } from "zod";

/**
 * 聊天同步配置
 */
export const chatSyncConfigSchema = z.object({
    /**
     * 是否启用聊天同步
     */
    enabled: z.boolean().default(false),
    /**
     * 是否启用从 Minecraft 到 平台 的转发
     */
    mcToPlatformEnabled: z.boolean().default(true),

    /**
     * 是否启用从 平台 到 Minecraft 的转发
     */
    platformToMcEnabled: z.boolean().default(true),

    /**
     * 目标群组配置列表
     */
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
                enabled: z.boolean().default(true)
            })
        )
        .default([]),

    /**
     * MC到平台的消息格式模板
     */
    mcToPlatformTemplate: z.string().default("[{serverName}] {playerName}: {message}"),

    /**
     * 平台到MC的消息格式模板
     */
    platformToMcTemplate: z.string().default("[{platform}] {nickname}: {message}"),

    /**
     * 过滤配置
     */
    filters: z
        .object({
            /**
             * 最小消息长度
             */
            minMessageLength: z.number().min(0).default(1),

            /**
             * 最大消息长度
             */
            maxMessageLength: z.number().min(1).default(500),

            /**
             * 黑名单关键词
             */
            blacklistKeywords: z.array(z.string()).default([])
        })
        .default({
            minMessageLength: 1,
            maxMessageLength: 500,
            blacklistKeywords: []
        })
});

export type ChatSyncConfig = z.infer<typeof chatSyncConfigSchema>;
