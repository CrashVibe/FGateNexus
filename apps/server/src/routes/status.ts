import { Hono } from "hono";

import { sseStream } from "#server/http/sse";
import { subscribeStatusEvents } from "#server/service/status-stream";
import { StatusEventSchema } from "#shared/model/status";

export const statusRouter = new Hono().get("/stream", (c) =>
  sseStream(c, "status", subscribeStatusEvents, (event) =>
    StatusEventSchema.parse(event),
  ),
);
