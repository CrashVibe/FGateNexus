import { useEffect, useRef } from "react";
import type { z } from "zod";

import type { DashboardAPI } from "#shared/model/dashboard";

type DashboardEvent = z.infer<typeof DashboardAPI.EVENTS.response>[number];

/**
 * 订阅首页事件流 SSE。监听 `player-event`，出错后自动重连。
 */
export const useDashboardEventStream = (
  enabled: boolean,
  onEvent: (event: DashboardEvent) => void,
): void => {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let source: EventSource | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = (): void => {
      source = new EventSource("/api/dashboard/stream");
      source.addEventListener("player-event", (event) => {
        try {
          onEventRef.current(
            JSON.parse((event as MessageEvent<string>).data) as DashboardEvent,
          );
        } catch {
          // 忽略非法 payload
        }
      });
      source.addEventListener("error", () => {
        source?.close();
        if (!stopped) {
          timer = setTimeout(connect, 1500);
        }
      });
    };

    if (enabled) {
      connect();
    }

    return () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      source?.close();
    };
  }, [enabled]);
};
