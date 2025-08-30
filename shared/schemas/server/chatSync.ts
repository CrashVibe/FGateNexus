import { z } from "zod";
import { TargetConfigSchema } from "./target";

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
             * 过滤模式：blacklist（黑名单模式，转发全部消息但屏蔽指定内容）或 whitelist（白名单模式，仅转发匹配的消息）
             */
            filterMode: z.enum(["blacklist", "whitelist"]).default("blacklist"),

            /**
             * 最小消息长度
             */
            minMessageLength: z.number().min(0).default(1),

            /**
             * 最大消息长度
             */
            maxMessageLength: z.number().min(1).default(500),

            /**
             * 黑名单关键词（仅在黑名单模式下使用）
             */
            blacklistKeywords: z.array(z.string()).default([]),

            /**
             * 黑名单正则表达式（仅在黑名单模式下使用）
             */
            blacklistRegex: z.array(z.string()).default([]),

            /**
             * 白名单前缀（仅在白名单模式下使用）
             */
            whitelistPrefixes: z.array(z.string()).default([]),

            /**
             * 白名单正则表达式（仅在白名单模式下使用）
             */
            whitelistRegex: z.array(z.string()).default([])
        })
        .default({
            filterMode: "blacklist",
            minMessageLength: 1,
            maxMessageLength: 500,
            blacklistKeywords: [],
            blacklistRegex: [],
            whitelistPrefixes: [],
            whitelistRegex: []
        })
});

export type ChatSyncConfig = z.infer<typeof chatSyncConfigSchema>;

export const chatSyncPatchBodySchema = z.object({
    chatsync: chatSyncConfigSchema,
    targets: z.array(
        z.object({
            id: z.uuidv4(),
            config: TargetConfigSchema
        })
    )
});
