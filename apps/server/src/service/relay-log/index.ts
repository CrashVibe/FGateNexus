import { createEventBus } from "#server/utils/event-bus";
import type { RelayEntry } from "#shared/model/dashboard";

// ponytail: 内存环形缓冲，重启即丢；要历史查询再落库
const MAX_PER_SERVER = 200;
const logs = new Map<number, RelayEntry[]>();
const bus = createEventBus<RelayEntry>();

export const subscribeRelays = bus.subscribe;

/** 记一条聊天转发结果（已发送 / 被过滤 / 未转发 / 失败） */
export const recordRelay = (entry: Omit<RelayEntry, "t">): void => {
  const full = { ...entry, t: Date.now() };
  const list = logs.get(entry.serverId) ?? [];
  list.push(full);
  if (list.length > MAX_PER_SERVER) {
    list.shift();
  }
  logs.set(entry.serverId, list);
  bus.broadcast(full);
};

/** 最新在前 */
export const getRelays = (limit: number, serverId?: number): RelayEntry[] =>
  (serverId === undefined
    ? [...logs.values()].flat()
    : (logs.get(serverId) ?? [])
  )
    .toSorted((a, b) => b.t - a.t)
    .slice(0, limit);
