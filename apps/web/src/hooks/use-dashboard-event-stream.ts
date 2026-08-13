import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";
import { useSSE } from "@/hooks/use-sse";

type DashboardEvent = z.infer<typeof DashboardAPI.EVENTS.response>[number];

/**
 * 订阅首页事件流 SSE。监听 `player-event`，出错后自动重连。
 */
export const useDashboardEventStream = (
  enabled: boolean,
  onEvent: (event: DashboardEvent) => void,
): void => {
  useSSE(enabled, "/api/dashboard/stream", "player-event", onEvent);
};
