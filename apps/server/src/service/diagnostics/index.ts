import type { LastEvent } from "#shared/model/status";

// ponytail: 内存里只留每个实体最近一条，重启即丢
const events = new Map<string, LastEvent>();

/** 记下服务器/机器人最近一次连接变化，给卡片显示「为什么离线」 */
export const noteLastEvent = (
  kind: "bot" | "server",
  id: number,
  text: string,
  ok: boolean,
): void => {
  events.set(`${kind}:${id}`, { at: Date.now(), ok, text });
};

export const forgetLastEvent = (kind: "bot" | "server", id: number): void => {
  events.delete(`${kind}:${id}`);
};

export const getLastEvent = (
  kind: "bot" | "server",
  id: number,
): LastEvent | null => events.get(`${kind}:${id}`) ?? null;
