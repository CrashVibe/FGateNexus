import { StatusCodes } from "http-status-codes";
import { startChromiumDownload } from "~~/server/service/browser-downloader";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler(async (event) => {
  void startChromiumDownload();
  return createApiResponse(event, "下载任务已启动", StatusCodes.ACCEPTED);
});
