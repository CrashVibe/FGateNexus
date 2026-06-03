import { logger } from "./logger";

/**
 * 关闭时执行的清理函数注册表，统一在 Nitro 的 close 钩子里被调用
 */
type CleanupFn = () => void | Promise<void>;

interface CleanupTask {
  readonly name: string;
  readonly fn: CleanupFn;
}

const tasks: CleanupTask[] = [];

export const registerCleanup = (name: string, fn: CleanupFn): void => {
  tasks.push({ fn, name });
};

export const runCleanups = async (): Promise<void> => {
  for (const { fn, name } of tasks) {
    try {
      await fn();
    } catch (error) {
      logger.error(error, `清理任务「${name}」执行失败`);
    }
  }
};
