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

// 替换 bindkickMsg 的占位符
export function replaceBindKickMsgPlaceholders(msg: string, playerName: string, message: string, time: string): string {
    return msg
        .replace(/\n/g, "\n&r")
        .replace(/#name/g, playerName)
        .replace(/#message/g, message)
        .replace(/#time/g, time);
}

// 替换 BindSuccessMsg 的占位符
export function replaceBindSuccessMsgPlaceholders(msg: string, playerName: string): string {
    return msg.replace(/#user/g, playerName);
}

// 替换 FailMsg 的占位符
export function replaceBindFailMsgPlaceholders(msg: string, playerName: string, why: string): string {
    return msg.replace(/#user/g, playerName).replace(/#why/g, why);
}

// 替换 NoBindKickMsg 的占位符
export function replaceNoBindKickMsgPlaceholders(
    msg: string,
    playerName: string,
    message: string,
    time: string
): string {
    return msg
        .replace(/\n/g, "\n&r")
        .replace(/#name/g, playerName)
        .replace(/#message/g, message)
        .replace(/#time/g, time);
}

// 替换 UnbindKickMsg 的占位符
export function replaceUnbindKickMsgPlaceholders(msg: string, socialAccount: string): string {
    return msg.replace(/\n/g, "\n&r").replace(/#social_account/g, socialAccount);
}

// 替换 UnbindSuccessMsg 的占位符
export function replaceUnbindSuccessMsgPlaceholders(msg: string, playerName: string): string {
    return msg.replace(/#user/g, playerName);
}

// 替换 UnbindFailMsg 的占位符
export function replaceUnbindFailMsgPlaceholders(msg: string, playerName: string, why: string): string {
    return msg.replace(/#user/g, playerName).replace(/#why/g, why);
}

// 获取默认的绑定配置
export const getDefaultBindingConfig = (): BindingConfig => {
    return BindingConfigSchema.parse({});
};
