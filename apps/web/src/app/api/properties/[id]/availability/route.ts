import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedis } from '@/lib/cache/redis';
import { availabilityCacheKey, bumpCacheStat } from '@/lib/cache/invalidation';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

const CACHE_TTL_SEC = 55;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const started = Date.now();
  try {
    const { searchParams } = new URL(_request.url);
    const roomId = searchParams.get('roomId');
    const roomKey = roomId && roomId.length > 0 ? `room:${roomId}` : 'all';

    const redis = getRedis();
    const cacheKey = availabilityCacheKey(params.id, roomKey);
    if (redis) {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        await bumpCacheStat('hit');
        logApiPerf('GET /api/properties/[id]/availability', Date.now() - started, {
          cache: 'hit',
          propertyId: params.id,
        });
        return NextResponse.json(JSON.parse(cached) as { availability: unknown[] });
      }
      await bumpCacheStat('miss');
    }

    const supabase = createClient();

    let query = supabase
      .from('property_availability')
      .select('day, status, room_id')
      .eq('property_id', params.id);

    if (roomId) {
      // If a specific room is requested, show its specific blocks OR property-wide blocks
      query = query.or(`room_id.is.null,room_id.eq.${roomId}`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const payload = { availability: data ?? [] };

    if (redis) {
      await redis.set(cacheKey, JSON.stringify(payload), { ex: CACHE_TTL_SEC });
    }

    logApiPerf('GET /api/properties/[id]/availability', Date.now() - started, {
      cache: 'miss',
      propertyId: params.id,
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load availability' },
      { status: 500 }
    );
  }
}


