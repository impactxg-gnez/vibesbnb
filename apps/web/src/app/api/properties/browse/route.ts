import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient, type SupabaseClient } from '@supabase/supabase-js';
import { PROPERTY_BROWSE_LIST_COLUMNS } from '@/lib/propertyPublicSelect';
import { getRedis } from '@/lib/cache/redis';
import { redisGetJson, redisSetJson } from '@/lib/cache/redisJson';
import { browseCacheKey, bumpCacheStat } from '@/lib/cache/invalidation';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

/** POSTgREST-safe chunk size for `in()` profile lookups */
const HOST_ID_CHUNK = 80;

/** Optional cap when clients only need a handful (homepage rows). Uncapped when omitted (search/map). */
const MAX_LIMIT_CAP = 48;

/** Page size for uncapped browse — keeps each query under statement timeout. */
const BROWSE_PAGE_SIZE = 40;

/** Cap carousel payload; cards only need a few images. */
const MAX_BROWSE_IMAGES = 8;

/**
 * Emergency-safe columns for when the full browse select triggers a PostgREST 500
 * (e.g. due to a broken column, view, policy, or type cast). Keep small + card-safe.
 */
const PROPERTY_BROWSE_FALLBACK_COLUMNS = [
  'id',
  'host_id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'reviews_count',
  'has_team_review',
  'images',
  'type',
  'amenities',
  'guests',
  'status',
  'created_at',
  'bedrooms',
  'bathrooms',
  'beds',
  'wellness_consumption_indoor_allowed',
  'wellness_consumption_outdoor_allowed',
  'latitude',
  'longitude',
] as const;

const PROPERTY_BROWSE_FALLBACK_SELECT = PROPERTY_BROWSE_FALLBACK_COLUMNS.join(',');

function trimBrowseRow(row: Record<string, unknown>): Record<string, unknown> {
  const images = row.images;
  if (Array.isArray(images) && images.length > MAX_BROWSE_IMAGES) {
    return { ...row, images: images.slice(0, MAX_BROWSE_IMAGES) };
  }
  return row;
}

async function fetchActivePropertiesPaged(
  supabase: SupabaseClient,
  select: string,
  limitParam?: number
): Promise<{ rows: Record<string, unknown>[]; error: { message?: string; code?: string; details?: string; hint?: string } | null }> {
  if (limitParam !== undefined) {
    const { data, error } = await supabase
      .from('properties')
      .select(select)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limitParam);
    if (error) return { rows: [], error };
    return {
      rows: ((data ?? []) as unknown as Record<string, unknown>[]).map(trimBrowseRow),
      error: null,
    };
  }

  const all: Record<string, unknown>[] = [];
  let from = 0;
  // Hard ceiling so a runaway loop cannot hang the function
  const hardCap = 2000;

  while (from < hardCap) {
    const to = from + BROWSE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('properties')
      .select(select)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      // Return what we have if a later page fails — better than empty search
      if (all.length > 0) {
        console.warn('[properties/browse] page failed after partial load', {
          from,
          loaded: all.length,
          message: error.message,
          code: error.code,
        });
        return { rows: all, error: null };
      }
      return { rows: [], error };
    }

    const page = ((data ?? []) as unknown as Record<string, unknown>[]).map(trimBrowseRow);
    if (page.length === 0) break;
    all.push(...page);
    if (page.length < BROWSE_PAGE_SIZE) break;
    from += BROWSE_PAGE_SIZE;
  }

  return { rows: all, error: null };
}

/**
 * CDN-cacheable aggregated payload: active properties (no embeddings) + host profile rows
 * needed for listing cards. Reduces duplicate browser→Supabase work and amortizes latency.
 */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey || url.includes('placeholder')) {
    return NextResponse.json(
      { properties: [], profiles: [], error: 'Supabase not configured' },
      { status: 503 }
    );
  }

  let limitParam: number | undefined;
  const rawLimit = request.nextUrl.searchParams.get('limit');
  if (rawLimit != null && rawLimit !== '') {
    const n = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: 'limit must be a positive integer' }, { status: 400 });
    }
    limitParam = Math.min(n, MAX_LIMIT_CAP);
  }

  const browseLimitKey = limitParam !== undefined ? String(limitParam) : 'all';
  const started = Date.now();

  try {
    let redis: ReturnType<typeof getRedis> = null;
    try {
      redis = getRedis();
    } catch (redisInitErr) {
      console.warn('[properties/browse] redis init failed', redisInitErr);
    }
    const bKey = browseCacheKey(browseLimitKey);
    if (redis) {
      try {
        const parsed = await redisGetJson<{
          properties: unknown[];
          profiles: unknown[];
          usedFallback?: boolean;
        }>(redis, bKey);
        if (parsed?.properties) {
          await bumpCacheStat('hit');
          logApiPerf('GET /api/properties/browse', Date.now() - started, {
            cache: 'hit',
            limit: browseLimitKey,
          });
          return NextResponse.json(parsed, {
            headers: {
              'Cache-Control':
                limitParam !== undefined
                  ? 'public, s-maxage=120, stale-while-revalidate=600'
                  : 'public, s-maxage=60, stale-while-revalidate=300',
              'X-Cache': 'redis-hit',
            },
          });
        }
        await bumpCacheStat('miss');
      } catch (redisReadErr) {
        console.warn('[properties/browse] redis read failed', redisReadErr);
      }
    }

    const supabase = createBrowserClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let usedFallback = false;
    let { rows, error: pErr } = await fetchActivePropertiesPaged(
      supabase,
      PROPERTY_BROWSE_LIST_COLUMNS,
      limitParam
    );

    if (pErr) {
      console.error('[properties/browse] primary query failed', {
        message: pErr.message,
        code: pErr.code,
        details: pErr.details,
        hint: pErr.hint,
      });

      const fallback = await fetchActivePropertiesPaged(
        supabase,
        PROPERTY_BROWSE_FALLBACK_SELECT,
        limitParam
      );
      if (fallback.error) {
        console.error('[properties/browse] fallback query failed', {
          message: fallback.error.message,
          code: fallback.error.code,
          details: fallback.error.details,
          hint: fallback.error.hint,
        });
        return NextResponse.json(
          {
            error: fallback.error.message,
            code: fallback.error.code,
            details: fallback.error.details,
            hint: fallback.error.hint,
          },
          { status: 500 }
        );
      }

      usedFallback = true;
      rows = fallback.rows;
      pErr = null;
    }

    const hostIdSet = new Set<string>();
    for (const r of rows) {
      const hid = r.host_id;
      if (typeof hid === 'string' && hid.length > 0) hostIdSet.add(hid);
    }
    const hostIds = Array.from(hostIdSet);

    const profiles: Record<string, unknown>[] = [];

    if (hostIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < hostIds.length; i += HOST_ID_CHUNK) {
        chunks.push(hostIds.slice(i, i + HOST_ID_CHUNK));
      }
      const chunkResults = await Promise.all(
        chunks.map((slice) =>
          supabase
            .from('profiles')
            .select('id, avatar_url, full_name, host_badge')
            .in('id', slice)
        )
      );
      for (const { data: profSlice, error: prErr } of chunkResults) {
        if (prErr) {
          console.error('[properties/browse] profiles chunk', prErr);
          continue;
        }
        if (profSlice?.length) profiles.push(...(profSlice as Record<string, unknown>[]));
      }
    }

    const payload = { properties: rows, profiles, usedFallback };

    if (redis) {
      try {
        await redisSetJson(redis, bKey, payload, { ex: 45 });
      } catch (redisWriteErr) {
        console.warn('[properties/browse] redis write failed', redisWriteErr);
      }
    }

    logApiPerf('GET /api/properties/browse', Date.now() - started, {
      cache: 'miss',
      limit: browseLimitKey,
      rows: rows.length,
    });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control':
          limitParam !== undefined
            ? 'public, s-maxage=120, stale-while-revalidate=600'
            : 'public, s-maxage=60, stale-while-revalidate=300',
        ...(usedFallback ? { 'X-Properties-Browse-Fallback': '1' } : {}),
        ...(redis ? { 'X-Cache': 'miss' } : {}),
      },
    });
  } catch (e: unknown) {
    console.error('[properties/browse]', e);
    const message = e instanceof Error ? e.message : 'Browse failed';
    return NextResponse.json({ error: 'Browse failed', detail: message }, { status: 500 });
  }
}
