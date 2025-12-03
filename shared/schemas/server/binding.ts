import { z } from "zod";

// 验证码模式枚举值
export enum CODE_MODES {
    MIX = "mix",
    NUMBER = "number",
    WORD = "word",
    UPPER = "upper",
    LOWER = "lower"
}

// 服务器配置的 Zod schema，包含默认值
export const BindingConfigSchema = z.object({
    maxBindCount: z.number().int().min(1, "最大绑定数量必须大于 0").max(10, "最大绑定数量不能超过 10").default(4),
    codeLength: z.number().int().min(4, "验证码长度必须不小于 4").max(12, "验证码长度不能超过 12").default(6),
    codeMode: z.enum(CODE_MODES).default(CODE_MODES.MIX),
    codeExpire: z
        .number()
        .int()
        .min(1, "验证码过期时间必须大于 0 分钟")
        .max(60, "验证码过期时间不能超过 60 分钟")
        .default(5),
    allowUnbind: z.boolean().default(true),
    allowGroupUnbind: z.boolean().default(true),
    prefix: z.string().min(1, "绑定前缀不能为空").max(50, "绑定前缀长度不能超过 50 个字符").default("/绑定 "),
    unbindPrefix: z.string().max(50, "解绑前缀长度不能超过 50 个字符").default("/解绑 "),
    forceBind: z.boolean().default(false),
    nobindkickMsg: z
        .string()
        .max(500, "踢出消息长度不能超过 500 个字符")
        .default(
            "你好，&a{name}&r！\n你还没有完成账号绑定，&c无法进入服务器！\n请在群里发送：&b{message}\n该验证码将在 &c{time} &r后失效，请尽快绑定。"
        ),
    unbindkickMsg: z
        .string()
        .max(500, "解绑踢出消息长度不能超过 500 个字符")
        .default("&l&k123456&a&l社交帐号被解绑&r&l&k123456\n您的社交账号&c {social_account} &r已在社交平台解绑。"),
    bindSuccessMsg: z
        .string()
        .max(200, "绑定成功消息长度不能超过 200 个字符")
        .default("绑定 {user} 成功! 你可以进入服务器了!"),
    bindFailMsg: z.string().max(200, "绑定失败消息长度不能超过 200 个字符").default("绑定 {user} 失败! {why}"),
    unbindSuccessMsg: z.string().max(200, "解绑成功消息长度不能超过 200 个字符").default("解除绑定 {user} 成功!"),
    unbindFailMsg: z.string().max(200, "解绑失败消息长度不能超过 200 个字符").default("解除绑定 {user} 失败! {why}")
});

export type BindingConfig = z.infer<typeof BindingConfigSchema>;
