import { renderTemplate } from ".";

// 通用模版渲染函数
export const renderTemplateMC = (
  template: string,
  params: Record<string, string>,
): string =>
  template
    // 保留换行替换
    .replaceAll("\n", "\n&r")
    .replaceAll(
      /\{(\w+)\}/g,
      (_: string, key: string) => params[key] ?? `{${key}}`,
    );

// 踢出未绑定账号消息
export const renderNoBindKick = (
  msg: string,
  playerName: string,
  message: string,
  time: string,
): string => renderTemplateMC(msg, { message, name: playerName, time });

// 踢出已解绑账号消息
export const renderUnbindKick = (msg: string, socialAccount: string): string =>
  renderTemplateMC(msg, { social_account: socialAccount });

// 绑定成功消息
export const renderBindSuccess = (msg: string, user: string): string =>
  renderTemplate(msg, { user });

// 绑定失败消息
export const renderBindFail = (
  msg: string,
  user: string,
  why: string,
): string => renderTemplate(msg, { user, why });

// 解绑成功消息
export const renderUnbindSuccess = (msg: string, user: string): string =>
  renderTemplate(msg, { user });

// 解绑失败消息
export const renderUnbindFail = (
  msg: string,
  user: string,
  why: string,
): string => renderTemplate(msg, { user, why });
