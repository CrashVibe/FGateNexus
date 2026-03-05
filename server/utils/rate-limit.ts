import { RateLimiter } from "limiter";
import { LRUCache } from "lru-cache";

export const RATE_LIMIT_PRESETS = {
  api: { interval: "minute", tokensPerInterval: 100 },
  login: { interval: "minute", tokensPerInterval: 5 },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

const limiters = new LRUCache<
  string,
  { limiter: RateLimiter; lastReset: number }
>({
  max: 1000,
  ttl: 30 * 60 * 1000,
});

const getLimiter = (key: string, preset: RateLimitPreset) => {
  let entry = limiters.get(key);
  if (!entry) {
    const { tokensPerInterval, interval } = RATE_LIMIT_PRESETS[preset];
    entry = {
      lastReset: Date.now(),
      limiter: new RateLimiter({
        fireImmediately: true,
        interval,
        tokensPerInterval,
      }),
    };
    limiters.set(key, entry);
  }
  return entry;
};

export const checkRateLimit = async (
  key: string,
  preset: RateLimitPreset = "api",
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> => {
  const { limiter, lastReset } = getLimiter(key, preset);
  const remaining = await limiter.removeTokens(1);

  if (remaining < 0) {
    const { interval } = RATE_LIMIT_PRESETS[preset];
    let intervalMs: number;
    if (interval === "minute") {
      intervalMs = 60_000;
    } else if (interval === "hour") {
      intervalMs = 3_600_000;
    } else {
      intervalMs = 1000;
    }
    const retryAfter = Math.max(
      1,
      Math.ceil((intervalMs - (Date.now() - lastReset)) / 1000),
    );
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: Math.max(0, remaining) };
};
