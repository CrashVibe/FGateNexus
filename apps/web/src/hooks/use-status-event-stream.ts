import { useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import type { StatusEvent } from "#shared/model/status";
import { useSSE } from "@/hooks/use-sse";

/**
 * 订阅 Bot / MC 服务器在线状态 SSE。监听 `status`，出错后自动重连。
 */
export const useStatusEventStream = (
  enabled: boolean,
  onEvent: (event: StatusEvent) => void,
): void => {
  useSSE(enabled, "/api/status/stream", "status", onEvent);
};

/** 按 kind 过滤状态事件，命中后整体失效对应查询缓存。 */
export const useEntityStatusStream = (
  kind: StatusEvent["kind"],
  queryKey: QueryKey,
): void => {
  const queryClient = useQueryClient();
  useStatusEventStream(true, (event) => {
    if (event.kind !== kind) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey });
  });
};
