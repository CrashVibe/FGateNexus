import { z } from "zod";

import type { ApiSchemaRegistry } from "#shared/model";

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
    request: z.void(),
    response: z.void(),
  },
  CHECK_UPDATE_GET: {
    description: "检查 Chromium 更新",
    request: z.void(),
    response: z.object({
      currentBuildId: z.string().nullable(),
      hasUpdate: z.boolean(),
      latestBuildId: z.string(),
    }),
  },
  DOWNLOAD_POST: {
    description: "开始下载 Chromium",
    request: z.void(),
    response: z.void(),
  },
  GET: {
    description: "获取浏览器设置",
    request: z.void(),
    response: z.object({
      executablePath: z.string().nullable(),
    }),
  },
  PATCH: {
    description: "更新浏览器设置",
    request: z.object({
      executablePath: z.string().nullable(),
    }),
    response: z.void(),
  },
} satisfies ApiSchemaRegistry;
