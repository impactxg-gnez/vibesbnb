import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';
import { getRedis } from '@/lib/cache/redis';
import { redisGetJson, redisSetJson } from '@/lib/cache/redisJson';
import { availabilityCacheKey, bumpCacheStat } from '@/lib/cache/invalidation';
import { logApiPerf } from '@/lib/monitoring/apiPerf';
import { calendarYmd } from '@/lib/dateUtils';

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
      const cached = await redisGetJson<{ availability: unknown[] }>(redis, cacheKey);
      if (cached?.availability) {
        await bumpCacheStat('hit');
        logApiPerf('GET /api/properties/[id]/availability', Date.now() - started, {
          cache: 'hit',
          propertyId: params.id,
        });
        return NextResponse.json(cached);
      }
      await bumpCacheStat('miss');
    }

    const supabase = hasServiceRoleKey() ? createServiceClient() : createClient();

    let query = supabase
      .from('property_availability')
      .select('day, status, room_id, price')
      .eq('property_id', params.id);

    if (roomId) {
      // If a specific room is requested, show its specific blocks OR property-wide blocks
      query = query.or(`room_id.is.null,room_id.eq.${roomId}`);
    }

    let data: any[] | null = null;
    let error: any = null;

    const initialRes = await query;

    // Graceful fallback if price column migration has not yet run in DB
    if (initialRes.error && (initialRes.error.code === '42703' || initialRes.error.message?.includes('price'))) {
      let fallbackQuery = supabase
        .from('property_availability')
        .select('day, status, room_id')
        .eq('property_id', params.id);

      if (roomId) {
        fallbackQuery = fallbackQuery.or(`room_id.is.null,room_id.eq.${roomId}`);
      }
      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data;
      error = fallbackRes.error;
    } else {
      data = initialRes.data;
      error = initialRes.error;
    }

    if (error) {
      throw error;
    }

    const payload = {
      availability: (data ?? []).map((row: { day?: string }) => ({
        ...row,
        day: calendarYmd(row.day) || row.day,
      })),
    };

    if (redis) {
      await redisSetJson(redis, cacheKey, payload, { ex: CACHE_TTL_SEC });
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
