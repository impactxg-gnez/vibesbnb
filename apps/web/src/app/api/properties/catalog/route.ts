import { NextResponse } from 'next/server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { getRedis } from '@/lib/cache/redis';
import { redisGetJson, redisSetJson } from '@/lib/cache/redisJson';
import { bumpCacheStat } from '@/lib/cache/invalidation';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const CACHE_KEY = 'catalog:v1:active';
const CACHE_TTL_SEC = 120;
const PAGE = 50;

/** Absolute minimum card fields — never images[] / cover_image / heavy text. */
const SELECT = [
  'id',
  'host_id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'reviews_count',
  'type',
  'guests',
  'status',
  'created_at',
  'bedrooms',
  'bathrooms',
  'beds',
  'wellness_friendly',
  'wellness_consumption_indoor_allowed',
  'wellness_consumption_outdoor_allowed',
  'latitude',
  'longitude',
  'min_booking_nights',
].join(',');

function toCard(row: Record<string, unknown>) {
  const id = typeof row.id === 'string' ? row.id : '';
  return {
    id: row.id,
    host_id: row.host_id,
    name: row.name,
    title: row.title,
    location: row.location,
    price: row.price,
    rating: row.rating,
    reviews_count: row.reviews_count,
    type: row.type,
    guests: row.guests,
    status: row.status,
    created_at: row.created_at,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    beds: row.beds,
    wellness_friendly: row.wellness_friendly,
    wellness_consumption_indoor_allowed: row.wellness_consumption_indoor_allowed,
    wellness_consumption_outdoor_allowed: row.wellness_consumption_outdoor_allowed,
    latitude: row.latitude,
    longitude: row.longitude,
    min_booking_nights: row.min_booking_nights,
    amenities: [],
    // Cards load photo via same-origin proxy (never ship images[] here).
    images: id ? [`/api/properties/${encodeURIComponent(id)}/cover`] : [],
    cover_image: null,
  };
}

/**
 * Lightweight active-listing catalog for search/map cold loads.
 * Guaranteed not to touch images[] — use this instead of /browse when galleries are huge.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || url.includes('placeholder')) {
    return NextResponse.json({ properties: [], profiles: [] }, { status: 503 });
  }

  const started = Date.now();

  try {
    let redis: ReturnType<typeof getRedis> = null;
    try {
      redis = getRedis();
    } catch {
      /* optional */
    }

    if (redis) {
      try {
        const hit = await redisGetJson<{ properties: unknown[]; profiles: unknown[] }>(
          redis,
          CACHE_KEY
        );
        if (hit?.properties?.length) {
          await bumpCacheStat('hit');
          logApiPerf('GET /api/properties/catalog', Date.now() - started, {
            cache: 'hit',
            rows: hit.properties.length,
          });
          return NextResponse.json(hit, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
              'X-Cache': 'redis-hit',
              'X-Catalog': 'v1',
            },
          });
        }
        await bumpCacheStat('miss');
      } catch {
        /* ignore */
      }
    }

    const supabase = createBrowserClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rows: Record<string, unknown>[] = [];
    let from = 0;
    while (from < 2000) {
      const to = from + PAGE - 1;
      const { data, error } = await supabase
        .from('properties')
        .select(SELECT)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) {
        if (rows.length > 0) break;
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 500 }
        );
      }
      const page = (data ?? []) as unknown as Record<string, unknown>[];
      if (page.length === 0) break;
      rows.push(...page);
      if (page.length < PAGE) break;
      from += PAGE;
    }

    const properties = rows.map(toCard);

    const hostIds = [
      ...new Set(
        properties
          .map((p) => (typeof p.host_id === 'string' ? p.host_id : ''))
          .filter(Boolean)
      ),
    ];
    const profiles: Record<string, unknown>[] = [];
    for (let i = 0; i < hostIds.length; i += 80) {
      const slice = hostIds.slice(i, i + 80);
      const { data } = await supabase
        .from('profiles')
        .select('id, avatar_url, full_name, host_badge')
        .in('id', slice);
      if (data?.length) profiles.push(...(data as Record<string, unknown>[]));
    }

    const payload = { properties, profiles, source: 'catalog-v1' };

    if (redis) {
      try {
        await redisSetJson(redis, CACHE_KEY, payload, { ex: CACHE_TTL_SEC });
      } catch {
        /* ignore */
      }
    }

    logApiPerf('GET /api/properties/catalog', Date.now() - started, {
      cache: 'miss',
      rows: properties.length,
    });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Catalog': 'v1',
        ...(redis ? { 'X-Cache': 'miss' } : {}),
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Catalog failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
