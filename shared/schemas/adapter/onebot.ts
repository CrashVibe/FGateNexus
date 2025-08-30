import { z } from "zod";

// Zod schemas for validation
export const OneBotWSReverseConfigSchema = z.object({
    selfId: z.string().min(1, "selfId 不能为空"),
    protocol: z.literal("ws-reverse"),
    token: z.preprocess((val) => (val === "" ? undefined : val), z.string()).optional(),
    path: z.string().min(1, "路径不能为空")
});

export const OneBotWSConfigSchema = z.object({
    selfId: z.string().min(1, "selfId 不能为空"),
    protocol: z.literal("ws"),
    token: z.preprocess((val) => (val === "" ? undefined : val), z.string()).optional(),
    endpoint: z.url("连接地址必须是有效的 URL"),
    timeout: z.number().int("超时时间必须是整数").positive("超时时间必须是正整数"),
    retryTimes: z.number().int("重试次数必须是整数").nonnegative("重试次数不能为负数"),
    retryInterval: z.number().int("重试间隔必须是整数").positive("重试间隔必须是正整数"),
    retryLazy: z.number().int("重试延迟必须是整数").nonnegative("重试延迟不能为负数")
});

export const OneBotConfigSchema = z.union([OneBotWSReverseConfigSchema, OneBotWSConfigSchema]);

export type OneBotWSReverseConfig = z.infer<typeof OneBotWSReverseConfigSchema>;
export type OneBotWSConfig = z.infer<typeof OneBotWSConfigSchema>;
export type OneBotConfig = z.infer<typeof OneBotConfigSchema>;
