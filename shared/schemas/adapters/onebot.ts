import { z } from "zod";

// Zod schemas for validation
export const OneBotWSReverseConfigSchema = z.object({
    selfId: z.string().min(1, "selfId 不能为空"),
    protocol: z.literal("ws-reverse"),
    path: z.string().min(1, "path 不能为空")
});

export const OneBotWSConfigSchema = z.object({
    selfId: z.string().min(1, "selfId 不能为空"),
    protocol: z.literal("ws"),
    endpoint: z.url("endpoint 必须是有效的 URL"),
    timeout: z.number().int().positive("timeout 必须是正整数"),
    retryTimes: z.number().int().nonnegative("retryTimes 不能为负数"),
    retryInterval: z.number().int().positive("retryInterval 必须是正整数"),
    retryLazy: z.number().int().nonnegative("retryLazy 不能为负数")
});

export const OneBotConfigSchema = z.union([OneBotWSReverseConfigSchema, OneBotWSConfigSchema]);

export type OneBotWSReverseConfig = z.infer<typeof OneBotWSReverseConfigSchema>;
export type OneBotWSConfig = z.infer<typeof OneBotWSConfigSchema>;
export type OneBotConfig = z.infer<typeof OneBotConfigSchema>;
