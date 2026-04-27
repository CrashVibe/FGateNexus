// https://github.com/benlavalley/nuxt-graceful-shutdown/blob/main/gracefulShutdownDev.ts

import readline from "node:readline";

import { defineNuxtModule } from "@nuxt/kit";

const shutdownHandlers: (() => Promise<void>)[] = [];

export const registerShutdownHandler = (handler: () => Promise<void>): void => {
  shutdownHandlers.push(handler);
};

export default defineNuxtModule({
  meta: {
    compatibility: {
      nuxt: ">=3.0.0",
    },
    name: "graceful-shutdown-dev",
  },
  async setup(_options, nuxt) {
    // dev only
    if (!nuxt.options.dev) {
      return;
    }

    process.stdin.resume();
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on("keypress", (_str, key) => {
      void (async () => {
        if (key.sequence === "\u0003") {
          console.log(
            "Graceful shutdown beginning - if this fails, send CTRL+K to forcibly terminate.",
          );
          await nuxt.hooks.callHook("close", nuxt);
          console.log(
            `Graceful shutdown continuing... calling ${shutdownHandlers.length} shutdown handlers`,
          );
          for (const handler of shutdownHandlers) {
            try {
              await handler();
            } catch (error) {
              console.error(
                "Graceful shutdown - error during shutdown handler:",
                error,
              );
            }
          }
          console.log("Graceful shutdown complete.");
          process.exit(0);
        } else if (key && key.ctrl && key.name === "k") {
          console.log("Graceful shutdown skipped - forcibly terminating");
          process.exit(0);
        }
      })();
    });
  },
});
