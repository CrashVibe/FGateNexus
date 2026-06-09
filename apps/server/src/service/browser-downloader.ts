import * as fs from "node:fs";
import * as path from "node:path";

import type { InstalledBrowser } from "@puppeteer/browsers";
import {
  Browser,
  detectBrowserPlatform,
  getInstalledBrowsers,
  install,
  resolveBuildId,
} from "@puppeteer/browsers";

import { logger } from "#server/utils/logger";
import type { DownloadState } from "#shared/model/settings";
import { ACTIVE_STATUSES } from "#shared/model/settings";

import { imageRenderer } from "./image-renderer";

const BROWSER_CACHE_DIR = path.resolve(process.cwd(), "data/browsers");
const BROWSER_CACHE_TMP_DIR = path.resolve(process.cwd(), "data/browsers-tmp");

const state: DownloadState = {
  buildId: null,
  downloadedBytes: 0,
  platform: null,
  status: "idle",
  totalBytes: 0,
};

let abortController: AbortController | null = null;

type DownloadStateListener = (state: Readonly<DownloadState>) => void;

const listeners = new Set<DownloadStateListener>();
const EMIT_INTERVAL_MS = 500;
let lastEmittedAt = 0;

const emitState = (force = false): void => {
  const now = Date.now();
  if (!force && now - lastEmittedAt < EMIT_INTERVAL_MS) {
    return;
  }
  lastEmittedAt = now;
  const snapshot = { ...state };
  for (const listener of listeners) {
    listener(snapshot);
  }
};

const setState = (
  partial: Partial<DownloadState>,
  options?: { force?: boolean },
): void => {
  Object.assign(state, partial);
  emitState(options?.force ?? false);
};

export const subscribeDownloadState = (
  listener: DownloadStateListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const resetState = (): void => {
  setState(
    {
      buildId: null,
      downloadedBytes: 0,
      error: undefined,
      executablePath: undefined,
      platform: null,
      status: "idle",
      totalBytes: 0,
    },
    { force: true },
  );
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "未知错误，请稍后重试";

const getInstalledChromes = async (): Promise<InstalledBrowser[]> => {
  if (!fs.existsSync(BROWSER_CACHE_DIR)) {
    return [];
  }
  try {
    const installed = await getInstalledBrowsers({
      cacheDir: BROWSER_CACHE_DIR,
    });
    return installed
      .filter((b) => b.browser === Browser.CHROMEHEADLESSSHELL)
      .toSorted((a, b) => b.buildId.localeCompare(a.buildId));
  } catch (error) {
    logger.warn(
      { cacheDir: BROWSER_CACHE_DIR, error },
      "读取已安装 Chromium 列表失败",
    );
    return [];
  }
};

const pruneOldBuilds = async (keepBuildId: string): Promise<void> => {
  const chromes = await getInstalledChromes();
  const stale = chromes.filter((b) => b.buildId !== keepBuildId);

  if (stale.length === 0) {
    logger.debug({ keepBuildId }, "无旧版 Chromium 需要清理");
    return;
  }

  logger.info({ count: stale.length, keepBuildId }, "开始清理旧版 Chromium");

  await Promise.allSettled(
    stale.map(async (b) => {
      const dir = path.dirname(b.executablePath);
      try {
        await fs.promises.rm(dir, { force: true, recursive: true });
        logger.info({ buildId: b.buildId, dir }, "已删除旧版 Chromium");
      } catch (error) {
        logger.warn(
          { buildId: b.buildId, dir, error },
          "删除旧版 Chromium 失败",
        );
      }
    }),
  );
};

const promoteFromTmp = async (): Promise<void> => {
  await fs.promises.mkdir(BROWSER_CACHE_DIR, { recursive: true });
  const entries = await fs.promises.readdir(BROWSER_CACHE_TMP_DIR);
  logger.debug(
    { dest: BROWSER_CACHE_DIR, entries, src: BROWSER_CACHE_TMP_DIR },
    "移动下载产物至正式目录",
  );
  await Promise.all(
    entries.map(async (entry) => {
      const dest = path.join(BROWSER_CACHE_DIR, entry);
      await fs.promises.rm(dest, { force: true, recursive: true });
      await fs.promises.rename(path.join(BROWSER_CACHE_TMP_DIR, entry), dest);
    }),
  );
};

export const getLatestInstalledChromiumPath = async (): Promise<
  string | undefined
> => {
  const chromes = await getInstalledChromes();
  const executablePath = chromes[0]?.executablePath;
  logger.debug({ executablePath }, "查询最新已安装 Chromium 路径");
  return executablePath;
};

export const checkChromiumUpdate = async (): Promise<{
  currentBuildId: string | null;
  hasUpdate: boolean;
  latestBuildId: string;
}> => {
  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error("无法检测当前平台");
  }

  const [latestBuildId, chromes] = await Promise.all([
    resolveBuildId(Browser.CHROMEHEADLESSSHELL, platform, "latest"),
    getInstalledChromes(),
  ]);

  const currentBuildId = chromes[0]?.buildId ?? null;
  const hasUpdate = currentBuildId !== latestBuildId;

  logger.info(
    { currentBuildId, hasUpdate, latestBuildId, platform },
    "Chromium 更新检查完成",
  );

  return { currentBuildId, hasUpdate, latestBuildId };
};

export const getEnrichedDownloadState = async (): Promise<
  Readonly<DownloadState>
> => {
  if (state.status !== "idle") {
    return { ...state };
  }

  const [latest] = await getInstalledChromes();
  if (!latest) {
    return { ...state };
  }

  return {
    buildId: latest.buildId,
    downloadedBytes: 0,
    executablePath: latest.executablePath,
    platform: latest.platform,
    status: "idle",
    totalBytes: 0,
  };
};

export const startChromiumDownload = async (): Promise<void> => {
  if (ACTIVE_STATUSES.has(state.status)) {
    logger.warn(
      { currentStatus: state.status },
      "下载请求被忽略：已有下载任务进行中",
    );
    throw new Error("下载已在进行中");
  }

  abortController = new AbortController();
  const { signal } = abortController;

  resetState();
  setState({ status: "resolving" }, { force: true });
  logger.info("开始 Chromium 下载流程");

  try {
    const platform = detectBrowserPlatform();
    if (!platform) {
      throw new Error("无法检测当前平台");
    }
    setState({ platform });
    logger.debug({ platform }, "已检测当前平台");

    let buildId: string;
    try {
      buildId = await resolveBuildId(
        Browser.CHROMEHEADLESSSHELL,
        platform,
        "latest",
      );
    } catch (error) {
      throw new Error(`获取最新版本号失败：${toErrorMessage(error)}`, {
        cause: error,
      });
    }

    logger.info({ buildId, platform }, "已解析最新 Chromium 版本号");

    if (signal.aborted) {
      logger.info({ buildId }, "下载已取消（resolve 阶段后）");
      resetState();
      return;
    }

    setState({ buildId, status: "downloading" }, { force: true });

    await fs.promises.rm(BROWSER_CACHE_TMP_DIR, {
      force: true,
      recursive: true,
    });
    await fs.promises.mkdir(BROWSER_CACHE_TMP_DIR, { recursive: true });
    logger.debug({ tmpDir: BROWSER_CACHE_TMP_DIR }, "已准备临时下载目录");

    let installed: InstalledBrowser;
    let lastLoggedPercent = -1;

    try {
      installed = await install({
        browser: Browser.CHROMEHEADLESSSHELL,
        buildId,
        cacheDir: BROWSER_CACHE_TMP_DIR,
        downloadProgressCallback: (downloaded, total) => {
          setState({ downloadedBytes: downloaded, totalBytes: total });

          if (total > 0) {
            const percent = Math.floor((downloaded / total) * 100);
            if (percent !== lastLoggedPercent && percent % 10 === 0) {
              lastLoggedPercent = percent;
              logger.debug(
                { buildId, downloaded, percent, total },
                `Chromium 下载进度 ${percent}%`,
              );
            }
          }

          if (
            total > 0 &&
            downloaded >= total &&
            state.status === "downloading"
          ) {
            setState({ status: "unpacking" }, { force: true });
            logger.info({ buildId, totalBytes: total }, "下载完成，开始解包");
          }
        },
        platform,
      });
    } catch (error) {
      throw new Error(`下载 Chromium 失败：${toErrorMessage(error)}`, {
        cause: error,
      });
    }

    if (signal.aborted) {
      logger.info({ buildId }, "下载已取消（install 阶段后）");
      resetState();
      return;
    }

    logger.info({ buildId }, "开始清理旧版并将新版移入正式目录");
    await pruneOldBuilds(buildId);

    try {
      await promoteFromTmp();
    } catch (error) {
      throw new Error(
        `安装 Chromium 失败（移动文件时出错）：${toErrorMessage(error)}`,
        {
          cause: error,
        },
      );
    } finally {
      await fs.promises.rm(BROWSER_CACHE_TMP_DIR, {
        force: true,
        recursive: true,
      });
      logger.debug({ tmpDir: BROWSER_CACHE_TMP_DIR }, "临时下载目录已清理");
    }

    const [promoted] = await getInstalledChromes();
    setState(
      {
        executablePath: promoted?.executablePath ?? installed.executablePath,
        status: "done",
      },
      { force: true },
    );
    resetState();

    logger.info(
      { buildId, executablePath: state.executablePath },
      "Chromium 安装完成",
    );

    try {
      await imageRenderer.start();
      logger.info("图片渲染服务已启动");
    } catch (error) {
      logger.error({ error }, "图片渲染服务启动失败");
    }
  } catch (error) {
    if (signal.aborted) {
      logger.info({ buildId: state.buildId }, "下载已取消（异常捕获阶段）");
      resetState();
      return;
    }

    setState(
      { error: toErrorMessage(error), status: "error" },
      { force: true },
    );
    logger.error(
      { buildId: state.buildId, error, platform: state.platform },
      "Chromium 下载流程失败",
    );
    throw error;
  }
};

export const cancelDownload = (): void => {
  logger.info({ currentStatus: state.status }, "取消 Chromium 下载");
  abortController?.abort();
  abortController = null;
  resetState();
};
