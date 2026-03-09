import { StatusCodes } from "http-status-codes";
import { cancelDownload } from "~~/server/service/browser-downloader";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler((event) => {
  cancelDownload();
  return createApiResponse(event, "下载已取消", StatusCodes.OK);
});
