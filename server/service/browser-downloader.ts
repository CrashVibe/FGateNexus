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

import { imageRenderer } from "./imgae-renderer";

const BROWSER_CACHE_DIR = path.resolve(process.cwd(), "data/browsers");

export type DownloadStatus =
  | "idle"
  | "resolving"
  | "downloading"
  | "unpacking"
  | "done"
  | "error";

export interface DownloadState {
  status: DownloadStatus;
  downloadedBytes: number;
  totalBytes: number;
  buildId: string;
  platform: string;
  error?: string;
  executablePath?: string;
}

const ACTIVE_STATUSES = new Set<DownloadStatus>([
  "resolving",
  "downloading",
  "unpacking",
]);

const state: DownloadState = {
  buildId: "",
  downloadedBytes: 0,
  platform: "",
  status: "idle",
  totalBytes: 0,
};

let abortController: AbortController | null = null;

const resetState = (): void => {
  Object.assign(state, {
    buildId: "",
    downloadedBytes: 0,
    error: undefined,
    executablePath: undefined,
    platform: "",
    status: "idle",
    totalBytes: 0,
  });
};

const classifyNetworkError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "网络问题，请稍后重试";
};

const getInstalledChromes = async (): Promise<InstalledBrowser[]> => {
  if (!fs.existsSync(BROWSER_CACHE_DIR)) {
    return [];
  }
  try {
    const installed = await getInstalledBrowsers({
      cacheDir: BROWSER_CACHE_DIR,
    });
    return installed
      .filter((b) => b.browser === Browser.CHROME)
      .toSorted((a, b) => b.buildId.localeCompare(a.buildId));
  } catch {
    return [];
  }
};

export const getLatestInstalledChromiumPath = async (): Promise<
  string | undefined
> => {
  const chromes = await getInstalledChromes();
  return chromes[0]?.executablePath;
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
    resolveBuildId(Browser.CHROME, platform, "latest"),
    getInstalledChromes(),
  ]);
  const currentBuildId = chromes[0]?.buildId ?? null;
  return {
    currentBuildId,
    hasUpdate: currentBuildId !== latestBuildId,
    latestBuildId,
  };
};

/**
 * 获取下载进度，若当前空闲且有已安装的 Chromium，则自动补充安装信息
 */
export const getEnrichedDownloadState = async (): Promise<
  Readonly<DownloadState>
> => {
  if (state.status !== "idle") {
    return { ...state };
  }

  const chromes = await getInstalledChromes();
  const [latest] = chromes;
  if (!latest) {
    return { ...state };
  }

  return {
    buildId: latest.buildId,
    downloadedBytes: 0,
    executablePath: latest.executablePath,
    platform: latest.platform,
    status: "done",
    totalBytes: 0,
  };
};

export const startChromiumDownload = async (): Promise<void> => {
  if (ACTIVE_STATUSES.has(state.status)) {
    throw new Error("下载已在进行中");
  }

  abortController = new AbortController();
  const { signal } = abortController;

  resetState();
  state.status = "resolving";

  try {
    const platform = detectBrowserPlatform();
    if (!platform) {
      throw new Error("无法检测当前平台");
    }
    state.platform = platform;

    let buildId: string;
    try {
      buildId = await resolveBuildId(Browser.CHROME, platform, "latest");
    } catch (error) {
      throw new Error(`获取最新版本号失败：${classifyNetworkError(error)}`, {
        cause: error,
      });
    }

    if (signal.aborted) {
      state.status = "idle";
      return;
    }

    state.buildId = buildId;
    state.status = "downloading";
    logger.info(`开始下载 Chromium buildId=${buildId} platform=${platform}`);

    await fs.promises.mkdir(BROWSER_CACHE_DIR, { recursive: true });

    let installed: InstalledBrowser;
    try {
      installed = await install({
        browser: Browser.CHROME,
        buildId,
        cacheDir: BROWSER_CACHE_DIR,
        downloadProgressCallback: (downloaded, total) => {
          state.downloadedBytes = downloaded;
          state.totalBytes = total;
          if (
            total > 0 &&
            downloaded >= total &&
            state.status === "downloading"
          ) {
            state.status = "unpacking";
          }
        },
        platform,
      });
    } catch (error) {
      throw new Error(`下载 Chromium 失败：${classifyNetworkError(error)}`, {
        cause: error,
      });
    }

    if (signal.aborted) {
      state.status = "idle";
      return;
    }

    state.status = "done";
    state.executablePath = installed.executablePath;
    logger.info(`Chromium 安装完成：${installed.executablePath}`);

    try {
      await imageRenderer.start();
    } catch (error) {
      logger.error(error, "图片渲染服务启动失败");
    }
  } catch (error) {
    if (signal.aborted) {
      state.status = "idle";
      return;
    }
    state.status = "error";
    state.error = error instanceof Error ? error.message : String(error);
    logger.error(error, "Chromium 下载失败");
    throw error;
  }
};

export const cancelDownload = (): void => {
  abortController?.abort();
  abortController = null;
  resetState();
};
