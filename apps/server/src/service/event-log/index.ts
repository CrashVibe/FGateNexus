import { insertPlayerEvent } from "#server/db/queries/player-event";
import type { MCEvent, MCEventType } from "#server/service/mcwsbridge/types";
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
  try {
    await insertPlayerEvent({
      createdAt: new Date(event.timestamp),
      data,
      playerName: payload.playerName ?? null,
      playerUuid: payload.playerUUID,
      serverId: event.serverId,
      type: event.type,
    });
  } catch (error) {
    log.warn(error, `记录事件 ${event.type} 失败`);
  }
};
