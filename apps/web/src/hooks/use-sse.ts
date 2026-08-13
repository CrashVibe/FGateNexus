import { useEffect, useRef } from "react";

/**
 * 订阅指定 SSE 端点的某个事件，出错后自动重连。
 */
export const useSSE = <T>(
  enabled: boolean,
  url: string,
  eventName: string,
  onEvent: (event: T) => void,
): void => {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let source: EventSource | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = (): void => {
      source = new EventSource(url);
      source.addEventListener(eventName, (event) => {
        try {
          onEventRef.current(
            JSON.parse((event as MessageEvent<string>).data) as T,
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
  }, [enabled, url, eventName]);
};
