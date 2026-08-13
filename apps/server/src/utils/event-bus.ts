type Listener<T> = (event: T) => void;

/** 进程内发布订阅 */
export const createEventBus = <T>() => {
  const listeners = new Set<Listener<T>>();
  return {
    broadcast: (event: T): void => {
      for (const listener of listeners) {
        listener(event);
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
