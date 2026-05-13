import { Redis } from '@upstash/redis';

let client: Redis | null | undefined;

/**
 * Upstash Redis (HTTP). When env is missing, all cache helpers no-op so local/dev keeps working.
 */
export function getRedis(): Redis | null {
  if (client !== undefined) {
    return client;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    client = null;
    return client;
  }
  client = new Redis({ url, token });
  return client;
}
