import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { PROPERTY_BROWSE_LIST_COLUMNS } from '@/lib/propertyPublicSelect';
import { getRedis } from '@/lib/cache/redis';
import { browseCacheKey, bumpCacheStat } from '@/lib/cache/invalidation';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

/** POSTgREST-safe chunk size for `in()` profile lookups */
const HOST_ID_CHUNK = 80;

/** Optional cap when clients only need a handful (homepage rows). Uncapped when omitted (search/map). */
const MAX_LIMIT_CAP = 48;

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
  'images',
  'type',
  'guests',
  'status',
  'created_at',
  'bedrooms',
  'bathrooms',
  'beds',
  'latitude',
  'longitude',
] as const;

const PROPERTY_BROWSE_FALLBACK_SELECT = PROPERTY_BROWSE_FALLBACK_COLUMNS.join(',');

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
    const redis = getRedis();
    const bKey = browseCacheKey(browseLimitKey);
    if (redis) {
      const cached = await redis.get<string>(bKey);
      if (cached) {
        await bumpCacheStat('hit');
        logApiPerf('GET /api/properties/browse', Date.now() - started, { cache: 'hit', limit: browseLimitKey });
        const parsed = JSON.parse(cached) as {
          properties: unknown[];
          profiles: unknown[];
          usedFallback?: boolean;
        };
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
    }

    const supabase = createBrowserClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase
      .from('properties')
      .select(PROPERTY_BROWSE_LIST_COLUMNS)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (limitParam !== undefined) {
      query = query.limit(limitParam);
    }

    let propertiesRaw: unknown = null;
    let pErr: any = null;

    const first = await query;
    propertiesRaw = first.data;
    pErr = first.error;

    let usedFallback = false;

    if (pErr) {
      console.error('[properties/browse] primary query failed', {
        message: pErr.message,
        code: pErr.code,
        details: pErr.details,
        hint: pErr.hint,
      });

      // Retry with a minimal select to keep the app usable while we fix the underlying DB issue.
      let fallbackQuery = supabase
        .from('properties')
        .select(PROPERTY_BROWSE_FALLBACK_SELECT)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (limitParam !== undefined) {
        fallbackQuery = fallbackQuery.limit(limitParam);
      }

      const fallback = await fallbackQuery;
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
      propertiesRaw = fallback.data;
      pErr = null;
    }

    const rows = ((propertiesRaw ?? []) as unknown) as Record<string, unknown>[];
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
          supabase.from('profiles').select('id, avatar_url, full_name').in('id', slice)
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
      await redis.set(bKey, JSON.stringify(payload), { ex: 45 });
    }

    logApiPerf('GET /api/properties/browse', Date.now() - started, {
      cache: 'miss',
      limit: browseLimitKey,
      rows: rows.length,
    });

    return NextResponse.json(
      payload,
      {
        headers: {
          'Cache-Control':
            limitParam !== undefined
              ? 'public, s-maxage=120, stale-while-revalidate=600'
              : 'public, s-maxage=60, stale-while-revalidate=300',
          ...(usedFallback ? { 'X-Properties-Browse-Fallback': '1' } : {}),
          ...(redis ? { 'X-Cache': 'miss' } : {}),
        },
      }
    );
  } catch (e: unknown) {
    console.error('[properties/browse]', e);
    return NextResponse.json({ error: 'Browse failed' }, { status: 500 });
  }
}
