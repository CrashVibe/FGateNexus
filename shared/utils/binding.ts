import { type BindingConfig, BindingConfigSchema, CODE_MODES } from "../schemas/server/binding";

// 生成验证码
export function generateVerificationCode(code_mode: CODE_MODES, length: number): string {
    const charSets: Record<CODE_MODES, string> = {
        [CODE_MODES.MIX]: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        [CODE_MODES.NUMBER]: "0123456789",
        [CODE_MODES.WORD]: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
        [CODE_MODES.UPPER]: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        [CODE_MODES.LOWER]: "abcdefghijklmnopqrstuvwxyz"
    };

    const chars = charSets[code_mode];
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

// 获取默认的绑定配置
export const getDefaultBindingConfig = (): BindingConfig => {
    return BindingConfigSchema.parse({});
};
