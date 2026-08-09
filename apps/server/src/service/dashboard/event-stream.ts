import type { RecentEvent } from "#server/db/queries/player-event";

type Listener = (event: RecentEvent) => void;

const listeners = new Set<Listener>();

export const broadcastDashboardEvent = (event: RecentEvent): void => {
  for (const listener of listeners) {
    listener(event);
  }
};

export const subscribeDashboardEvents = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
