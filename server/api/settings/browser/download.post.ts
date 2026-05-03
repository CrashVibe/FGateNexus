import { StatusCodes } from "http-status-codes";
import { startChromiumDownload } from "~~/server/service/browser-downloader";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";

export default defineEventHandler(async (event) => {
  try {
    void (async () => {
      try {
        await startChromiumDownload();
      } catch (error) {
        logger.error(error, "Chromium 下载任务启动失败");
      }
    })();
    return createApiResponse(event, "下载任务已启动", StatusCodes.ACCEPTED);
  } catch (error) {
    logger.error(error, "启动下载任务失败");
    return createErrorResponse(event, ApiError.internal("启动下载任务失败"));
  }
});
