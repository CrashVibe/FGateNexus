import { StatusCodes } from "http-status-codes";
import { getLatestInstalledChromiumPath } from "~~/server/service/browser-downloader";
import { SettingsAPI } from "~~/shared/schemas/settings";
import { createApiResponse } from "~~/shared/types";

export default defineEventHandler(async (event) => {
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
});
