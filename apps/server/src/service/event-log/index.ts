import { insertPlayerEvent } from "#server/db/queries/player-event";
import { broadcastDashboardEvent } from "#server/service/dashboard/event-stream";
import type { MCEvent, MCEventType } from "#server/service/mcwsbridge/types";
import { getCachedServer } from "#server/service/server-cache";
import { logger } from "#server/utils/logger";

const log = logger.child({}, { msgPrefix: "[EventLog] " });

const PERSISTED_EVENTS = new Set<MCEventType>([
  "player.death",
  "player.join",
  "player.leave",
]);

export const recordMcEvent = async (event: MCEvent): Promise<void> => {
  if (!PERSISTED_EVENTS.has(event.type)) {
    return;
  }
  const payload = event.payload as {
    playerName?: string;
    playerUUID?: string;
    deathMessage?: string | null;
  };
  if (!payload.playerUUID) {
    return;
  }
  const data =
    event.type === "player.death"
      ? { message: payload.deathMessage ?? null }
      : null;
  const createdAt = new Date(event.timestamp);
  try {
    const id = await insertPlayerEvent({
      createdAt,
      data,
      playerName: payload.playerName ?? null,
      playerUuid: payload.playerUUID,
      serverId: event.serverId,
      type: event.type,
    });

    const server = await getCachedServer(event.serverId);
    broadcastDashboardEvent({
      createdAt,
      data,
      id,
      playerName: payload.playerName ?? null,
      serverId: event.serverId,
      serverName: server?.name ?? "未知服务器",
      type: event.type,
    });
  } catch (error) {
    log.warn(error, `记录事件 ${event.type} 失败`);
  }
};
