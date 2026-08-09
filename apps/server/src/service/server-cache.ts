import { getServerByIdWithBotAndTargets } from "#server/db/queries/server";
import type { ServerWithBotAndTargets } from "#server/db/queries/server";

/** 避免每条事件都查库 */
const SERVER_CACHE_TTL_MS = 5000;
const serverCache = new Map<
  number,
  { data: ServerWithBotAndTargets | undefined; expiresAt: number }
>();

export const getCachedServer = async (
  serverId: number,
): Promise<ServerWithBotAndTargets | undefined> => {
  const entry = serverCache.get(serverId);
  if (entry && Date.now() <= entry.expiresAt) {
    return entry.data;
  }
  const data = await getServerByIdWithBotAndTargets(serverId);
  serverCache.set(serverId, {
    data,
    expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
  });
  return data;
};
