import * as path from "node:path";
import { createInterface as createReadlineInterface } from "node:readline/promises";

import { runCleanups } from "#server/utils/cleanup-registry";
import { configManager } from "#server/utils/config";
import { logger } from "#server/utils/logger";

import { printBanner } from "./boot/banner";
import { prepareDatabase, runMigrations } from "./boot/database";
import { loadStaticHandler } from "./boot/static";

/** 是否以 `bun build --compile` 出的单 binary 方式运行（execPath 不是 bun/node） */
const execName = path.basename(process.execPath).toLowerCase();
const isCompiledBinary =
  execName !== "bun" && execName !== "bun-debug" && execName !== "node";

/** 解析 CHROMIUM_PATH 环境变量并写入 config。 */
const resolveChromiumPath = (): void => {
  const envChromiumPath = process.env.CHROMIUM_PATH?.trim();
  if (!envChromiumPath) {
    return;
  }
  const { config } = configManager;
  if ((config.browser.executablePath ?? null) !== envChromiumPath) {
    configManager.updateConfig({
      browser: { ...config.browser, executablePath: envChromiumPath },
    });
  }
};

/** 解析 Sentry 开关（仅环境变量；交互式询问见 promptSentryOptIn）。 */
const resolveSentry = (): void => {
  const env = process.env.SENTRY_ENABLED?.trim().toLowerCase();
  if (env !== "true" && env !== "false") {
    return;
  }
  const { config } = configManager;
  const enabled = env === "true";
  if (config.sentry.enabled !== enabled) {
    configManager.updateConfig({ sentry: { ...config.sentry, enabled } });
  }
};

/** 仅编译二进制且从未做过选择时，提示用户是否启用 Sentry。 */
const promptSentryOptIn = async (): Promise<void> => {
  if (!isCompiledBinary || configManager.config.sentry.enabled !== null) {
    return;
  }
  const rl = createReadlineInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(
    "\n是否启用 Sentry 错误追踪以帮助改善 FGate Nexus？[y/N] ",
  );
  rl.close();
  const enabled = answer.trim().toLowerCase() === "y";
  configManager.updateConfig({
    sentry: { ...configManager.config.sentry, enabled },
  });
  logger.info(`Sentry 已${enabled ? "启用" : "禁用"}`);
};

/** 若 enabled 且 SENTRY_DSN 已配置则初始化 @sentry/bun。 */
const initSentry = async (): Promise<void> => {
  const { enabled, instanceId } = configManager.config.sentry;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!enabled || !dsn) {
    return;
  }
  const {
    getGlobalScope,
    httpIntegration,
    init,
    onUncaughtExceptionIntegration,
    onUnhandledRejectionIntegration,
    zodErrorsIntegration,
  } = await import("@sentry/bun");
  init({
    debug: false,
    dsn,
    environment: isCompiledBinary ? "production" : "development",
    integrations: [
      httpIntegration(),
      onUncaughtExceptionIntegration(),
      onUnhandledRejectionIntegration(),
      zodErrorsIntegration(),
    ],
    sendDefaultPii: true,
    tracesSampleRate: 1,
  });
  getGlobalScope().setUser({ id: instanceId });
  logger.info("Sentry 错误追踪已初始化");
};

const main = async (): Promise<void> => {
  // 单 binary：可把工作执行文件切换到所在目录，使 data/ 与 config/ 与其同级。
  if (isCompiledBinary) {
    process.chdir(path.dirname(process.execPath));
  }

  configManager.init();
  resolveChromiumPath();
  resolveSentry();
  await promptSentryOptIn();
  await initSentry();

  await prepareDatabase();
  await runMigrations();

  printBanner(isCompiledBinary);

  // 以下模块在导入时即会打开数据库连接，必须在 DB 就绪后再动态导入。
  const { getLatestInstalledChromiumPath } =
    await import("#server/service/browser-downloader");
  const { imageRenderer } = await import("#server/service/image-renderer");
  const { chatBridge } = await import("#server/service/chatbridge");
  const { templateInstanceStore } =
    await import("#server/service/template/template-instance-store");
  const { app } = await import("./app");

  templateInstanceStore.init();
  const { handleMcBridgeUpgrade, MC_BRIDGE_PATH, mcBridgeWebSocket } =
    await import("./ws/mc-bridge");

  // 图片渲染：仅在已配置或已安装 Chromium 时启动。
  const chromiumAvailable =
    configManager.config.browser.executablePath !== undefined ||
    (await getLatestInstalledChromiumPath()) !== undefined;
  if (chromiumAvailable) {
    try {
      await imageRenderer.start();
    } catch (error) {
      logger.error(error, "图片渲染服务启动失败");
    }
  }

  // Koishi 聊天桥。
  await chatBridge.init();

  const { startStatusCollector } =
    await import("#server/service/metrics/status-collector");
  startStatusCollector();

  // 单 binary：托管内联的前端 SPA（开发态由 Vite dev server 提供，这里为 null）。
  const staticHandler = isCompiledBinary ? await loadStaticHandler() : null;

  const { host } = configManager.config.server;
  const port = Number(process.env.PORT ?? configManager.config.server.port);
  const server = Bun.serve({
    async fetch(req, srv) {
      const url = new URL(req.url);
      if (
        url.pathname === MC_BRIDGE_PATH &&
        req.headers.get("upgrade")?.toLowerCase() === "websocket"
      ) {
        return handleMcBridgeUpgrade(req, srv);
      }
      const res = await app.fetch(req, srv);
      // 非 /api 的 404 交给 SPA 静态托管（含前端路由回退）。
      if (
        staticHandler &&
        res.status === 404 &&
        !url.pathname.startsWith("/api")
      ) {
        return staticHandler(url.pathname);
      }
      return res;
    },
    hostname: host,
    port,
    websocket: { ...mcBridgeWebSocket, perMessageDeflate: true },
  });

  logger.info(`服务已启动：http://${host}:${server.port}`);

  let isClosing = false;
  const shutdown = async (): Promise<void> => {
    if (isClosing) {
      return;
    }
    isClosing = true;
    logger.info("等我收拾一下嗷...");
    await server.stop();
    try {
      await chatBridge.close();
    } catch (error) {
      logger.error(error, "关闭「Koishi」时出错");
    }
    try {
      await imageRenderer.stop();
    } catch (error) {
      logger.error(error, "关闭「图片渲染服务」时出错");
    }
    await runCleanups();
    logger.info("收拾好啦，祝你有好的一天～");
    process.exit(0);
  };

  for (const signal of ["SIGTERM", "SIGINT", "SIGQUIT"] as const) {
    process.on(signal, () => {
      void shutdown();
    });
  }
};

try {
  await main();
} catch (error) {
  logger.error(error, "应用启动失败");
  process.exit(1);
}
