import { z } from "zod";

export const MilkyConfigSchema = z.object({
  endpoint: z.url("连接地址必须是有效的 URL").default("http://127.0.0.1:3000"),
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
  token: z.string(),
});

export type MilkyConfig = z.infer<typeof MilkyConfigSchema>;
