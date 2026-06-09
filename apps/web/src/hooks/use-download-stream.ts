import { useEffect, useRef } from "react";

import type { DownloadState } from "#shared/model/settings";

/**
 * 订阅浏览器下载进度 SSE。
 * 监听 `progress` 事件，解析为 {@link DownloadState}；出错后自动重连。
 */
export const useDownloadStream = (
  enabled: boolean,
  onState: (state: DownloadState) => void,
): void => {
  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  useEffect(() => {
    let source: EventSource | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = (): void => {
      source = new EventSource("/api/settings/browser/download-stream");
      source.addEventListener("progress", (event) => {
        try {
          onStateRef.current(
            JSON.parse((event as MessageEvent<string>).data) as DownloadState,
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
