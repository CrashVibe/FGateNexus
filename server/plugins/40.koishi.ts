import { chatBridge } from "~~/server/service/chatbridge";
export default defineNitroPlugin((nitro) => {
  void chatBridge.init();

  nitro.hooks.hook("close", async () => {
    logger.info("正在关闭 Koishi...");
    await chatBridge.close();
    logger.info("Koishi 已关闭");
  });
});
