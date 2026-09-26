import { logger } from "#server/utils/logger";

type Listener<T> = (event: T) => void;

/** 进程内发布订阅 */
export const createEventBus = <T>() => {
  const listeners = new Set<Listener<T>>();
  return {
    broadcast: (event: T): void => {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          // 一个订阅者炸了不能拖垮广播方
          logger.error(error, "[EventBus] 订阅者异常");
        }
      }
    },
    subscribe: (listener: Listener<T>): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
