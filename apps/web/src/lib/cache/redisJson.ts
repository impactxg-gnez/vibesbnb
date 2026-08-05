import type { Redis } from '@upstash/redis';

/**
 * Upstash auto (de)serializes JSON. Callers historically JSON.stringify'd before set
 * and JSON.parse'd after get — parse then throws on cache hits ("[object Object]").
 */
export async function redisGetJson<T>(redis: Redis, key: string): Promise<T | null> {
  const cached = await redis.get(key);
  if (cached == null) return null;
  if (typeof cached === 'string') {
    try {
      return JSON.parse(cached) as T;
    } catch {
      return null;
    }
  }
  return cached as T;
}

export async function redisSetJson(
  redis: Redis,
  key: string,
  value: unknown,
  opts: { ex: number }
): Promise<void> {
  await redis.set(key, value, opts);
}
