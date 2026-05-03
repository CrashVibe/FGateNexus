import readline from "node:readline";

export default defineNitroPlugin((nitro) => {
  const canUseRawMode = typeof process.stdin.setRawMode === "function";
  if (!process.stdin.isTTY || !canUseRawMode) {
    return;
  }
  logger.info("按 Ctrl+C 可以安全地关闭，按 Ctrl+K 可以强制退出");

  process.stdin.resume();
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on("keypress", (_str, key) => {
    void (async () => {
      if (key.sequence === "\u0003") {
        logger.info("等我收拾一下嗷...");
        await nitro.hooks.callHook("close");
        logger.info("收拾好啦，祝你有好的一天～");
        process.exit(0);
      } else if (key.ctrl && key.name === "k") {
        logger.warn("好好好，不收拾了，跑路辽");
        process.exit(0);
      }
    })();
  });
});
