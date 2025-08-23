import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

/**
 * 聊天同步配置
 */
export const CommandConfigSchema = z.object({
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
                enabled: z.boolean().default(true),

                /**
                 * 权限
                 * 当前适配器和对应目标的权限
                 */
                permissions: z.array(z.string()).default([]),

                /**
                 * 执行指令前缀
                 */
                prefix: z.string().default("/"),

                /**
                 * 本地 ID
                 */
                id: z.uuid().default(() => uuidv4())
            })
        )
        .default([])
});

export type CommandConfig = z.infer<typeof CommandConfigSchema>;
export type CommandTarget = CommandConfig["targets"][number];
