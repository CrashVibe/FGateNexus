import readline from "node:readline";

const forceExit = () => {
  logger.warn("好好好，不收拾了，跑路辽");
  process.exit(0);
};

export default defineNitroPlugin((nitro) => {
  let isClosing = false;
  const gracefulShutdown = async () => {
    if (isClosing) {
      return;
    }
    isClosing = true;
    logger.info("等我收拾一下嗷...");
    await nitro.hooks.callHook("close");
    logger.info("收拾好啦，祝你有好的一天～");
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void gracefulShutdown();
  });
  process.on("SIGINT", () => {
    void gracefulShutdown();
  });
  process.on("SIGQUIT", () => {
    void gracefulShutdown();
  });

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
        await gracefulShutdown();
      } else if (key.ctrl && key.name === "k") {
        forceExit();
      }
    })();
  });
});
