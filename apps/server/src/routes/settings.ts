import * as fs from "node:fs";

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { StatusCodes } from "http-status-codes";

import { fail, guard, ok, readJson } from "#server/http/respond";
import {
  cancelDownload,
  checkChromiumUpdate,
  getEnrichedDownloadState,
  getLatestInstalledChromiumPath,
  startChromiumDownload,
  subscribeDownloadState,
} from "#server/service/browser-downloader";
import { imageRenderer } from "#server/service/image-renderer";
import { configManager } from "#server/utils/config";
import { logger } from "#server/utils/logger";
import { ApiError } from "#shared/model/error";
import { SettingsAPI } from "#shared/model/settings";

const KEEPALIVE_INTERVAL_MS = 15_000;

export const settingsRouter = new Hono()
  .get("/sentry", (c) => c.json(configManager.config.sentry))
  .get(
    "/browser",
    guard("获取浏览器配置失败", async (c) => {
      const { browser } = configManager.config;
      const executablePath =
        browser.executablePath ?? (await getLatestInstalledChromiumPath());
      return ok(
        c,
        "获取浏览器配置成功",
        StatusCodes.OK,
        SettingsAPI.GET.response.parse({
          executablePath: executablePath ?? null,
        }),
      );
    }),
  )
  .patch(
    "/browser",
    guard("更新浏览器路径失败", async (c) => {
      const parsed = SettingsAPI.PATCH.request.safeParse(await readJson(c));
      if (!parsed.success) {
        return fail(c, ApiError.validation("请求参数错误"), parsed.error);
      }
      const { executablePath } = parsed.data;

      if (executablePath !== null) {
        try {
          await fs.promises.access(executablePath, fs.constants.X_OK);
        } catch {
          return fail(
            c,
            ApiError.badRequest(
              `浏览器可执行文件不存在或不可执行：${executablePath}`,
            ),
          );
        }
      }

      logger.info({ executablePath }, "更新浏览器路径配置");
      configManager.updateConfig({
        browser: { executablePath: executablePath ?? undefined },
      });

      if (
        configManager.config.browser.executablePath !== undefined ||
        (await getLatestInstalledChromiumPath()) !== undefined
      ) {
        try {
          await imageRenderer.start();
        } catch (error) {
          logger.error(error, "图片渲染服务启动失败");
        }
      } else {
        await imageRenderer.stop();
        logger.warn(
          "未配置浏览器路径且未检测到已安装的 Chromium，图片渲染服务已停止",
        );
      }

      return ok(c, "浏览器路径已更新", StatusCodes.OK);
    }),
  )
  .get(
    "/browser/check-update",
    guard("检查更新失败", async (c) => {
      const updateInfo = await checkChromiumUpdate();
      return ok(
        c,
        "检查更新完成",
        StatusCodes.OK,
        SettingsAPI.CHECK_UPDATE_GET.response.parse(updateInfo),
      );
    }),
  )
  .post(
    "/browser/download",
    guard("启动下载任务失败", async (c) => {
      void (async () => {
        try {
          await startChromiumDownload();
        } catch (error) {
          logger.error(error, "Chromium 下载任务启动失败");
        }
      })();
      return ok(c, "下载任务已启动", StatusCodes.ACCEPTED);
    }),
  )
  .post(
    "/browser/download-cancel",
    guard("取消下载失败", async (c) => {
      cancelDownload();
      return ok(c, "下载已取消", StatusCodes.OK);
    }),
  )
  .get("/browser/download-stream", (c) =>
    streamSSE(c, async (stream) => {
      const send = async (payload: unknown) =>
        stream.writeSSE({ data: JSON.stringify(payload), event: "progress" });

      const unsubscribe = subscribeDownloadState((next) => {
        void send(next);
      });
      stream.onAbort(unsubscribe);

      try {
        try {
          await send(await getEnrichedDownloadState());
        } catch (error) {
          logger.error(error, "获取下载状态失败");
          await send({ error: "获取下载状态失败", status: "error" });
        }
        // 保持连接：周期性 ping，直到客户端断开。
        while (!stream.aborted) {
          await stream.sleep(KEEPALIVE_INTERVAL_MS);
          await stream.writeSSE({ data: "{}", event: "ping" });
        }
      } finally {
        unsubscribe();
      }
    }),
  );
