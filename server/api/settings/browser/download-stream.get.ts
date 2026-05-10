import { once } from "node:events";

import { setResponseHeaders } from "h3";
import {
  getEnrichedDownloadState,
  subscribeDownloadState,
} from "~~/server/service/browser-downloader";

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no",
  });

  const { res } = event.node;

  const send = (payload: unknown) => {
    res.write(`event: progress\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const sendPing = () => {
    res.write("event: ping\n");
    res.write("data: {}\n\n");
  };

  send(await getEnrichedDownloadState());

  const unsubscribe = subscribeDownloadState((next) => {
    send(next);
  });

  const keepAliveTimer = setInterval(sendPing, 15_000);

  const close = () => {
    clearInterval(keepAliveTimer);
    unsubscribe();
    res.end();
  };

  event.node.req.on("close", close);
  event.node.req.on("error", close);

  await once(event.node.req, "close");
});
