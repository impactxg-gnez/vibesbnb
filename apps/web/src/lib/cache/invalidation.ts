import { createHash } from 'crypto';
import { getRedis } from '@/lib/cache/redis';

const AVAIL_PROP_PREFIX = 'avail:v1:';
const BROWSE_PREFIX = 'browse:v2:';

export function availabilityCacheKey(propertyId: string, roomKey: string): string {
  return `${AVAIL_PROP_PREFIX}${propertyId}:${roomKey}`;
}

export function browseCacheKey(limitLabel: string): string {
  return `${BROWSE_PREFIX}${limitLabel}`;
}

/** Cache key for POST /api/properties/availability-batch bodies */
export function availabilityBatchCacheKey(propertyIds: string[], nights: string[]): string {
  const sortedIds = [...propertyIds].sort().join(',');
  const sortedNights = [...nights].sort().join(',');
  const h = createHash('sha256').update(sortedIds).update('|').update(sortedNights).digest('hex');
  return `availBatch:v1:${h}`;
}

export async function invalidatePropertyListingCaches(propertyId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const pipe = redis.pipeline();
  pipe.del(availabilityCacheKey(propertyId, 'all'));
  // Browse payloads are keyed by limit; keep TTL short — explicit bust common caps.
  for (const cap of ['all', '48', '24', '12']) {
    pipe.del(browseCacheKey(cap));
  }
  await pipe.exec();
}

export async function bumpCacheStat(field: 'hit' | 'miss'): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hincrby('metrics:cache:v1', field, 1);
}
