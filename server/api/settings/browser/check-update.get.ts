import { StatusCodes } from "http-status-codes";
import { checkChromiumUpdate } from "~~/server/service/browser-downloader";

import { createApiResponse } from "#shared/model";
import { SettingsAPI } from "#shared/model/settings";

export default defineEventHandler(async (event) => {
  const updateInfo = await checkChromiumUpdate();
  return createApiResponse(
    event,
    "检查更新完成",
    StatusCodes.OK,
    SettingsAPI.CHECK_UPDATE_GET.response.parse(updateInfo),
  );
});
