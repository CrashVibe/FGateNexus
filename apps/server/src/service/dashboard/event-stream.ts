import type { RecentEvent } from "#server/db/queries/player-event";
import { createEventBus } from "#server/utils/event-bus";

const bus = createEventBus<RecentEvent>();

export const broadcastDashboardEvent = bus.broadcast;
export const subscribeDashboardEvents = bus.subscribe;
