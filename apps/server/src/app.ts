import { Hono } from "hono";

import { authMiddleware } from "#server/http/auth-middleware";
import { errorHandler } from "#server/http/respond";

import { authRouter } from "./routes/auth";
import { botRouter } from "./routes/bot";
import { dashboardRouter } from "./routes/dashboard";
import { playersRouter } from "./routes/players";
import { serversRouter } from "./routes/servers";
import { settingsRouter } from "./routes/settings";
import { statusRouter } from "./routes/status";
import { templateInstancesRouter } from "./routes/template-instances";
import { templatesRouter } from "./routes/templates";

/**
 * Hono 应用（HTTP API）
 */
const app = new Hono()
  .get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }))
  .use("/api/*", authMiddleware)
  .route("/api/auth", authRouter)
  .route("/api/bot", botRouter)
  .route("/api/dashboard", dashboardRouter)
  .route("/api/servers", serversRouter)
  .route("/api/players", playersRouter)
  .route("/api/settings", settingsRouter)
  .route("/api/status", statusRouter)
  .route("/api/templates", templatesRouter)
  .route("/api/servers/:serverId/template-instances", templateInstancesRouter);

app.onError(errorHandler);

export { app };
