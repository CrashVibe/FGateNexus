import { renderTemplate } from ".";

// 通用模版渲染函数
export function renderTemplateMC(template: string, params: Record<string, string>): string {
    return template
        .replace(/\n/g, "\n&r") // 保留换行替换
        .replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

// 踢出未绑定账号消息
export function renderNoBindKick(msg: string, playerName: string, message: string, time: string): string {
    return renderTemplateMC(msg, { name: playerName, message, time });
}

// 踢出已解绑账号消息
export function renderUnbindKick(msg: string, socialAccount: string): string {
    return renderTemplateMC(msg, { social_account: socialAccount });
}

// 绑定成功消息
export function renderBindSuccess(msg: string, user: string): string {
    return renderTemplate(msg, { user });
}

// 绑定失败消息
export function renderBindFail(msg: string, user: string, why: string): string {
    return renderTemplate(msg, { user, why });
}

// 解绑成功消息
export function renderUnbindSuccess(msg: string, user: string): string {
    return renderTemplate(msg, { user });
}

// 解绑失败消息
export function renderUnbindFail(msg: string, user: string, why: string): string {
    return renderTemplate(msg, { user, why });
}
