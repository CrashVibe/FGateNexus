import { once } from "node:events";

import { setResponseHeaders } from "h3";
import {
  getEnrichedDownloadState,
  subscribeDownloadState,
} from "~~/server/service/browser-downloader";

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    "Cache-Control": "no-cache, no-transform",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
  });

  const { req, res } = event.node;

  if (!res || res.writableEnded) {
    return;
  }

  res.flushHeaders?.();

  const writeEvent = (name: string, payload: unknown) => {
    if (res.writableEnded) {
      return;
    }
    res.write(`event: ${name}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const send = (payload: unknown) => {
    writeEvent("progress", payload);
  };

  const sendPing = () => {
    writeEvent("ping", {});
  };

  try {
    send(await getEnrichedDownloadState());
  } catch (error) {
    logger.error(error, "获取下载状态失败");
    send({ error: "获取下载状态失败", status: "error" });
  }

  const unsubscribe = subscribeDownloadState((next) => {
    send(next);
  });

  const keepAliveTimer = setInterval(sendPing, 15_000);

  const close = () => {
    clearInterval(keepAliveTimer);
    unsubscribe();
    if (!res.writableEnded) {
      res.end();
    }
  };

  req.on("close", close);
  req.on("error", close);

  res.on("error", close);

  await once(req, "close");
});
