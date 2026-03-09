import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/schemas";

export const DownloadStatus = z.enum([
  "idle",
  "resolving",
  "downloading",
  "unpacking",
  "done",
  "error",
]);

export const SettingsAPI = {
  CANCEL_POST: {
    description: "取消下载",
    request: z.object({}),
    response: z.object({}),
  },
  CHECK_UPDATE_GET: {
    description: "检查 Chromium 更新",
    request: z.object({}),
    response: z.object({
      currentBuildId: z.string().nullable(),
      hasUpdate: z.boolean(),
      latestBuildId: z.string(),
    }),
  },
  DOWNLOAD_POST: {
    description: "开始下载 Chromium",
    request: z.object({}),
    response: z.object({}),
  },
  DOWNLOAD_PROGRESS_GET: {
    description: "获取下载进度",
    request: z.object({}),
    response: z.object({
      buildId: z.string(),
      downloadedBytes: z.number(),
      error: z.string().optional(),
      executablePath: z.string().optional(),
      platform: z.string(),
      status: DownloadStatus,
      totalBytes: z.number(),
    }),
  },
  GET: {
    description: "获取浏览器设置",
    request: z.object({}),
    response: z.object({
      executablePath: z.string().nullable(),
    }),
  },
  PATCH: {
    description: "更新浏览器设置",
    request: z.object({
      executablePath: z.string().nullable(),
    }),
    response: z.object({}),
  },
} satisfies ApiSchemaRegistry;
