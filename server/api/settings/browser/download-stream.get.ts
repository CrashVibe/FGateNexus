import { createEventStream } from "h3";
import {
  getEnrichedDownloadState,
  subscribeDownloadState,
} from "~~/server/service/browser-downloader";

export default defineEventHandler(async (event) => {
  const eventStream = createEventStream(event);

  const send = async (payload: unknown) => {
    await eventStream.push({
      data: JSON.stringify(payload),
      event: "progress",
    });
  };

  const sendPing = async () => {
    await eventStream.push({
      data: "{}",
      event: "ping",
    });
  };

  void (async () => {
    try {
      await send(await getEnrichedDownloadState());
    } catch (error) {
      logger.error(error, "获取下载状态失败");
      await send({ error: "获取下载状态失败", status: "error" });
    }
  })();

  const unsubscribe = subscribeDownloadState((next) => {
    void send(next);
  });

  const keepAliveTimer = setInterval(() => {
    void sendPing();
  }, 15_000);

  eventStream.onClosed(() => {
    clearInterval(keepAliveTimer);
    unsubscribe();
  });

  return eventStream.send();
});
