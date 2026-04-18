import { StatusCodes } from "http-status-codes";
import { getEnrichedDownloadState } from "~~/server/service/browser-downloader";

import { createApiResponse } from "#shared/model";
import { SettingsAPI } from "#shared/model/settings";

export default defineEventHandler(async (event) => {
  const state = await getEnrichedDownloadState();
  return createApiResponse(
    event,
    "获取下载进度成功",
    StatusCodes.OK,
    SettingsAPI.DOWNLOAD_PROGRESS_GET.response.parse(state),
  );
});
