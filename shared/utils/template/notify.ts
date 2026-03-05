import { renderTemplate } from ".";

// 玩家加入消息
export const renderJoinMessage = (msg: string, playerName: string): string =>
  renderTemplate(msg, { playerName });

// 玩家离开消息
export const renderLeaveMessage = (msg: string, playerName: string): string =>
  renderTemplate(msg, { playerName });

// 玩家死亡消息
export const renderDeathMessage = (
  msg: string,
  playerName: string,
  deathMessage: string,
): string => renderTemplate(msg, { deathMessage, playerName });
