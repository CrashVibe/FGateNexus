import { StatusCodes } from "http-status-codes";
import { getEnrichedDownloadState } from "~~/server/service/browser-downloader";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { SettingsAPI } from "#shared/model/settings";

export default defineEventHandler(async (event) => {
  try {
    const state = await getEnrichedDownloadState();
    return createApiResponse(
      event,
      "获取下载进度成功",
      StatusCodes.OK,
      SettingsAPI.DOWNLOAD_PROGRESS_GET.response.parse(state),
    );
  } catch (error) {
    logger.error(error, "获取下载进度失败");
    return createErrorResponse(event, ApiError.internal("获取下载进度失败"));
  }
});
