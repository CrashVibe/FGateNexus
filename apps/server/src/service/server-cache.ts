import { getServerByIdWithBotAndTargets } from "#server/db/queries/server";
import type { ServerWithBotAndTargets } from "#server/db/queries/server";

/** 缓存有效期。 */
const SERVER_CACHE_TTL_MS = 5000;
const serverCache = new Map<
  number,
  { data: ServerWithBotAndTargets; expiresAt: number }
>();

export const getCachedServer = async (
  serverId: number,
): Promise<ServerWithBotAndTargets | undefined> => {
  const entry = serverCache.get(serverId);
  if (entry && Date.now() <= entry.expiresAt) {
    return entry.data;
  }
  const data = await getServerByIdWithBotAndTargets(serverId);
  if (data) {
    serverCache.set(serverId, {
      data,
      expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
    });
  }
  return data;
};

// ponytail: 管理端写得少，任何写操作清全表
export const clearServerCache = (): void => {
  serverCache.clear();
};
