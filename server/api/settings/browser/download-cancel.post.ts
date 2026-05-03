import { StatusCodes } from "http-status-codes";
import { cancelDownload } from "~~/server/service/browser-downloader";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";

export default defineEventHandler((event) => {
  try {
    cancelDownload();
    return createApiResponse(event, "下载已取消", StatusCodes.OK);
  } catch (error) {
    logger.error(error, "取消下载失败");
    return createErrorResponse(event, ApiError.internal("取消下载失败"));
  }
});
