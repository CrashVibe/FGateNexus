import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

const KEEPALIVE_INTERVAL_MS = 15_000;

/** 订阅 bus 事件并转发为 SSE，附带心跳 */
export const sseStream = <T>(
  c: Context,
  eventName: string,
  subscribe: (listener: (event: T) => void) => () => void,
  parse: (event: T) => unknown,
) =>
  streamSSE(c, async (stream) => {
    const unsubscribe = subscribe((event) => {
      void stream.writeSSE({
        data: JSON.stringify(parse(event)),
        event: eventName,
      });
    });
    stream.onAbort(unsubscribe);

    try {
      while (!stream.aborted) {
        await stream.sleep(KEEPALIVE_INTERVAL_MS);
        await stream.writeSSE({ data: "{}", event: "ping" });
      }
    } finally {
      unsubscribe();
    }
  });
