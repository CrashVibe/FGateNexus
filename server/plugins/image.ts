import { getLatestInstalledChromiumPath } from "~~/server/service/browser-downloader";
import { imageRenderer } from "~~/server/service/imgae-renderer";

export default defineNitroPlugin((nitro) => {
  void (async () => {
    if (
      configManager.config.browser.executablePath !== undefined ||
      (await getLatestInstalledChromiumPath()) !== undefined
    ) {
      try {
        await imageRenderer.start();
      } catch (error) {
        logger.error(error, "图片渲染服务启动失败");
      }
    }
  })();

  nitro.hooks.hook("close", async () => {
    logger.info("正在关闭图片渲染服务...");
    await imageRenderer.stop();
    logger.info("图片渲染服务已关闭");
  });
});
