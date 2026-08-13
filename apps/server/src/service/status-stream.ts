import { createEventBus } from "#server/utils/event-bus";
import type { StatusEvent } from "#shared/model/status";

const bus = createEventBus<StatusEvent>();

export const broadcastStatusEvent = bus.broadcast;
export const subscribeStatusEvents = bus.subscribe;
