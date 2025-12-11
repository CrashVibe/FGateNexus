import { RateLimiter } from "limiter";
import { LRUCache } from "lru-cache";

export const RATE_LIMIT_PRESETS = {
    login: { tokensPerInterval: 5, interval: "minute" },
    api: { tokensPerInterval: 100, interval: "minute" }
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

const limiters = new LRUCache<string, { limiter: RateLimiter; lastReset: number }>({
    max: 1000,
    ttl: 30 * 60 * 1000
});

function getLimiter(key: string, preset: RateLimitPreset) {
    let entry = limiters.get(key);
    if (!entry) {
        const { tokensPerInterval, interval } = RATE_LIMIT_PRESETS[preset];
        entry = {
            limiter: new RateLimiter({ tokensPerInterval, interval, fireImmediately: true }),
            lastReset: Date.now()
        };
        limiters.set(key, entry);
    }
    return entry;
}

export async function checkRateLimit(
    key: string,
    preset: RateLimitPreset = "api"
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    const { limiter, lastReset } = getLimiter(key, preset);
    const remaining = await limiter.removeTokens(1);

    if (remaining < 0) {
        const { interval } = RATE_LIMIT_PRESETS[preset];
        const intervalMs = interval === "minute" ? 60000 : interval === "hour" ? 3600000 : 1000;
        const retryAfter = Math.max(1, Math.ceil((intervalMs - (Date.now() - lastReset)) / 1000));
        return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining: Math.max(0, remaining) };
}
