import { StatusCodes } from "http-status-codes";
import { getLatestInstalledChromiumPath } from "~~/server/service/browser-downloader";

import { createApiResponse } from "#shared/model";
import { ApiError, createErrorResponse } from "#shared/model/error";
import { SettingsAPI } from "#shared/model/settings";

export default defineEventHandler(async (event) => {
  try {
    const { browser } = configManager.config;
    const configuredPath = browser.executablePath ?? null;
    const executablePath =
      configuredPath ?? (await getLatestInstalledChromiumPath());
    return createApiResponse(
      event,
      "获取浏览器配置成功",
      StatusCodes.OK,
      SettingsAPI.GET.response.parse({
        executablePath: executablePath ?? null,
      }),
    );
  } catch (error) {
    logger.error(error, "获取浏览器配置失败");
    return createErrorResponse(event, ApiError.internal("获取浏览器配置失败"));
  }
});
