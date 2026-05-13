import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getRedis } from '@/lib/cache/redis';
import { availabilityBatchCacheKey, bumpCacheStat } from '@/lib/cache/invalidation';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

const MAX_IDS = 160;
const MAX_NIGHTS = 62;
const CACHE_TTL_SEC = 28;

type BlockRow = { property_id: string; day: string; status: string };

export async function POST(request: NextRequest) {
  const started = Date.now();
  try {
    const body = await request.json().catch(() => null) as {
      propertyIds?: unknown;
      nights?: unknown;
    } | null;
    const propertyIds = Array.isArray(body?.propertyIds)
      ? body!.propertyIds!.filter((x): x is string => typeof x === 'string' && x.length > 0)
      : [];
    const nights = Array.isArray(body?.nights)
      ? body!.nights!.filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x))
      : [];

    if (propertyIds.length === 0 || nights.length === 0) {
      return NextResponse.json({ blocked: [] as BlockRow[] });
    }
    if (propertyIds.length > MAX_IDS || nights.length > MAX_NIGHTS) {
      return NextResponse.json(
        { error: `Too many ids or nights (max ${MAX_IDS} properties, ${MAX_NIGHTS} nights)` },
        { status: 400 }
      );
    }

    const cacheKey = availabilityBatchCacheKey(propertyIds, nights);
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        await bumpCacheStat('hit');
        logApiPerf('POST /api/properties/availability-batch', Date.now() - started, {
          cache: 'hit',
          ids: propertyIds.length,
          nights: nights.length,
        });
        return NextResponse.json(JSON.parse(cached) as { blocked: BlockRow[] });
      }
      await bumpCacheStat('miss');
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from('property_availability')
      .select('property_id, day, status')
      .in('property_id', propertyIds)
      .in('day', nights)
      .in('status', ['blocked', 'booked']);

    if (error) {
      throw error;
    }

    const blocked = (data ?? []) as BlockRow[];
    const payload = { blocked };

    if (redis) {
      await redis.set(cacheKey, JSON.stringify(payload), { ex: CACHE_TTL_SEC });
    }

    logApiPerf('POST /api/properties/availability-batch', Date.now() - started, {
      cache: 'miss',
      ids: propertyIds.length,
      nights: nights.length,
      rows: blocked.length,
    });

    return NextResponse.json(payload);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'availability batch failed';
    console.error('[availability-batch]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
