import { renderTemplate } from ".";

// 玩家加入消息
export function renderJoinMessage(msg: string, playerName: string): string {
  return renderTemplate(msg, { playerName });
}

// 玩家离开消息
export function renderLeaveMessage(msg: string, playerName: string): string {
  return renderTemplate(msg, { playerName });
}

// 玩家死亡消息
export function renderDeathMessage(msg: string, playerName: string, deathMessage: string): string {
  return renderTemplate(msg, { playerName, deathMessage });
}
