import { z } from "zod";

export const KookWsConfigSchema = z.object({
  protocol: z.literal("ws"),
  retryInterval: z
    .number()
    .int("重试间隔必须是整数")
    .positive("重试间隔必须是正整数")
    .default(3000),
  retryLazy: z
    .number()
    .int("重试延迟必须是整数")
    .nonnegative("重试延迟不能为负数")
    .default(1000),
  retryTimes: z
    .number()
    .int("重试次数必须是整数")
    .nonnegative("重试次数不能为负数")
    .default(3),
  token: z.string().nonempty("Token 不能为空"),
});

export const KookHttpConfigSchema = z.object({
  path: z.string().nonempty("路径不能为空").default("/kook"),
  protocol: z.literal("http"),
  token: z.string().nonempty("Token 不能为空"),
  verifyToken: z.string().nonempty("验证令牌不能为空"),
});

export const KookConfigSchema = z.union([
  KookWsConfigSchema,
  KookHttpConfigSchema,
]);

export type KookWsConfig = z.infer<typeof KookWsConfigSchema>;
export type KookHttpConfig = z.infer<typeof KookHttpConfigSchema>;
export type KookConfig = z.infer<typeof KookConfigSchema>;
