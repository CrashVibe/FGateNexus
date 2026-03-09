import { StatusCodes } from "http-status-codes";
import { checkChromiumUpdate } from "~~/server/service/browser-downloader";
import { SettingsAPI } from "~~/shared/schemas/settings";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler(async (event) => {
  const updateInfo = await checkChromiumUpdate();
  return createApiResponse(
    event,
    "检查更新完成",
    StatusCodes.OK,
    SettingsAPI.CHECK_UPDATE_GET.response.parse(updateInfo),
  );
});
