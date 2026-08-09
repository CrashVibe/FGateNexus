/** 并发数信号量 */
export const createSemaphore = () => {
  let active = 0;
  const queue: (() => void)[] = [];

  return {
    async acquire(max: number): Promise<() => void> {
      if (active >= max) {
        const { promise, resolve } = Promise.withResolvers();
        queue.push(resolve);
        await promise;
      }
      active += 1;
      return () => {
        active -= 1;
        queue.shift()?.();
      };
    },
  };
};
