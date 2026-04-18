import * as fs from "node:fs";

import { StatusCodes } from "http-status-codes";
import { getLatestInstalledChromiumPath } from "~~/server/service/browser-downloader";
import { imageRenderer } from "~~/server/service/imgae-renderer";

import { createApiResponse } from "#shared/model";
import { SettingsAPI } from "#shared/model/settings";

export default defineEventHandler(async (event) => {
  const body: unknown = await readBody(event);
  const { executablePath } = SettingsAPI.PATCH.request.parse(body);

  if (executablePath !== null) {
    try {
      await fs.promises.access(executablePath, fs.constants.X_OK);
    } catch {
      throw createError({
        message: `浏览器可执行文件不存在或不可执行：${executablePath}`,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }
  }

  logger.info({ executablePath }, "更新浏览器路径配置");

  configManager.updateConfig({
    browser: {
      executablePath: executablePath ?? undefined,
    },
  });

  if (
    configManager.config.browser.executablePath !== undefined ||
    (await getLatestInstalledChromiumPath()) !== undefined
  ) {
    try {
      await imageRenderer.start();
    } catch (error) {
      logger.error(error, "图片渲染服务启动失败");
    }
  } else {
    await imageRenderer.stop();
    logger.warn(
      "未配置浏览器路径且未检测到已安装的 Chromium，图片渲染服务已停止",
    );
  }

  return createApiResponse(event, "浏览器路径已更新", StatusCodes.OK);
});
