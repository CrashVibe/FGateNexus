import { chatBridge } from "../service/chatbridge/chatbridge";
export default defineNitroPlugin(async (nitro) => {
  await chatBridge.init();

  nitro.hooks.hook("close", async () => {
    logger.info("正在关闭 Koishi...");
    await chatBridge.close();
    logger.info("Koishi 已关闭");
  });
});
