import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

const KEEPALIVE_INTERVAL_MS = 15_000;

/** 订阅 bus 事件并转发为 SSE，附带心跳 */
export const sseStream = <T>(
  c: Context,
  eventName: string,
  subscribe: (listener: (event: T) => void) => () => void,
  parse: (event: T) => unknown,
  /** 连上时先推一份当前状态 */
  initial?: () => Promise<unknown>,
) =>
  streamSSE(c, async (stream) => {
    const send = async (data: unknown): Promise<void> => {
      await stream.writeSSE({ data: JSON.stringify(data), event: eventName });
    };
    const unsubscribe = subscribe((event) => {
      void send(parse(event));
    });
    stream.onAbort(unsubscribe);

    try {
      if (initial) {
        await send(await initial());
      }
      while (!stream.aborted) {
        await stream.sleep(KEEPALIVE_INTERVAL_MS);
        await stream.writeSSE({ data: "{}", event: "ping" });
      }
    } finally {
      unsubscribe();
    }
  });
