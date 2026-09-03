import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient, type SupabaseClient } from '@supabase/supabase-js';
import { getRedis } from '@/lib/cache/redis';
import { redisGetJson, redisSetJson } from '@/lib/cache/redisJson';
import { browseCacheKey, bumpCacheStat } from '@/lib/cache/invalidation';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

const HOST_ID_CHUNK = 80;
const MAX_LIMIT_CAP = 48;
const BROWSE_PAGE_SIZE = 20;
const COVER_ENRICH_CHUNK = 40;

/**
 * Card fields without `images` / heavy arrays — full image arrays are huge
 * (50–200+ URLs) and cause statement timeouts on uncapped browse.
 */
const PROPERTY_BROWSE_NO_IMAGES_SELECT = [
  'id',
  'host_id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'reviews_count',
  'has_team_review',
  'type',
  'amenities',
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
  'cover_image',
].join(',');

const PROPERTY_BROWSE_NO_IMAGES_FALLBACK = [
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
  'latitude',
  'longitude',
].join(',');

const PROPERTY_BROWSE_MINIMAL_SELECT = [
  'id',
  'host_id',
  'name',
  'title',
  'location',
  'price',
  'rating',
  'type',
  'guests',
  'status',
  'created_at',
].join(',');

function isHttpCoverUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.length < 12) return false;
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false;
  if (lower.startsWith('data:')) return false;
  if (lower.includes('via.placeholder')) return false;
  if (lower.includes('photo-1542718610')) return false;
  return true;
}

/** Collect up to 3 remote http(s) covers — never data: / placeholders. */
function httpCoversFromUnknown(images: unknown, extra?: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: unknown) => {
    if (typeof raw !== 'string' || !isHttpCoverUrl(raw)) return;
    const url = raw.trim();
    if (seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  if (Array.isArray(images)) {
    for (const raw of images) {
      push(raw);
      if (out.length >= 3) return out;
    }
  }
  if (typeof extra === 'string') push(extra);
  else if (Array.isArray(extra)) {
    for (const raw of extra) {
      push(raw);
      if (out.length >= 3) return out;
    }
  }
  return out;
}

function withCardImages(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    images: httpCoversFromUnknown(r.images, r.cover_image ?? r.cover_images),
  }));
}

function missingHttpCovers(rows: Record<string, unknown>[]): boolean {
  return rows.some((r) => httpCoversFromUnknown(r.images).length === 0);
}

/** Attach http cover URLs without selecting full images[] over PostgREST. */
async function enrichCoverImages(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return rows;
  if (!missingHttpCovers(rows)) return withCardImages(rows);

  const needIds = rows
    .filter((r) => httpCoversFromUnknown(r.images).length === 0)
    .map((r) => (typeof r.id === 'string' ? r.id : null))
    .filter((id): id is string => Boolean(id));

  const coverById = new Map<string, string[]>();

  for (let i = 0; i < needIds.length; i += COVER_ENRICH_CHUNK) {
    const slice = needIds.slice(i, i + COVER_ENRICH_CHUNK);
    const { data, error } = await supabase.rpc('property_cover_images', {
      p_ids: slice,
    });
    if (error) {
      console.warn('[properties/browse] cover enrich RPC failed', {
        message: error.message,
        code: error.code,
        chunk: i,
      });
      break;
    }
    for (const row of (data ?? []) as Array<{
      id?: string;
      cover_image?: string | null;
      cover_images?: string[] | null;
    }>) {
      if (typeof row.id !== 'string') continue;
      const covers = httpCoversFromUnknown(row.cover_images, row.cover_image);
      if (covers.length) coverById.set(row.id, covers);
    }
  }

  return rows.map((r) => {
    const existing = httpCoversFromUnknown(r.images);
    if (existing.length) return { ...r, images: existing };
    const id = typeof r.id === 'string' ? r.id : '';
    return { ...r, images: coverById.get(id) ?? [] };
  });
}

async function fetchViaRpc(
  supabase: SupabaseClient,
  limitParam?: number
): Promise<{ rows: Record<string, unknown>[]; error: any | null; usedRpc: boolean }> {
  const pageSize = limitParam !== undefined ? limitParam : BROWSE_PAGE_SIZE;
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  const hardCap = limitParam !== undefined ? limitParam : 2000;

  while (offset < hardCap) {
    const take =
      limitParam !== undefined ? limitParam : Math.min(pageSize, hardCap - offset);
    const { data, error } = await supabase.rpc('browse_active_property_cards', {
      p_limit: take,
      p_offset: offset,
    });

    if (error) {
      // Return what we have if a later page fails — better than empty search
      if (all.length > 0) {
        console.warn('[properties/browse] RPC page failed after partial load', {
          offset,
          loaded: all.length,
          message: error.message,
          code: error.code,
        });
        return { rows: withCardImages(all), error: null, usedRpc: true };
      }
      return { rows: [], error, usedRpc: false };
    }

    const page = (data ?? []) as Record<string, unknown>[];
    if (page.length === 0) break;
    all.push(...page);
    if (limitParam !== undefined) break;
    if (page.length < take) break;
    offset += take;
  }

  return { rows: withCardImages(all), error: null, usedRpc: true };
}

async function fetchWithoutImages(
  supabase: SupabaseClient,
  select: string,
  limitParam?: number
): Promise<{ rows: Record<string, unknown>[]; error: any | null }> {
  if (limitParam !== undefined) {
    const { data, error } = await supabase
      .from('properties')
      .select(select)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limitParam);
    if (error) return { rows: [], error };
    return {
      rows: (data ?? []) as unknown as Record<string, unknown>[],
      error: null,
    };
  }

  const all: Record<string, unknown>[] = [];
  let from = 0;
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
      if (all.length > 0) {
        console.warn('[properties/browse] no-images page failed after partial', error.message);
        return { rows: all, error: null };
      }
      return { rows: [], error };
    }
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    if (page.length === 0) break;
    all.push(...page);
    if (page.length < BROWSE_PAGE_SIZE) break;
    from += BROWSE_PAGE_SIZE;
  }
  return { rows: all, error: null };
}

/**
 * CDN-cacheable aggregated payload: active properties (no embeddings) + host profile rows
 * needed for listing cards.
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
    let rows: Record<string, unknown>[] = [];

    // Prefer RPC that returns http(s) covers only (requires SQL migration).
    const rpcResult = await fetchViaRpc(supabase, limitParam);
    if (!rpcResult.error) {
      rows = rpcResult.rows;
      // Older RPC builds may still return data: blobs — strip + re-cover from DB.
      if (missingHttpCovers(rows)) {
        rows = await enrichCoverImages(supabase, rows);
      }
    } else {
      console.warn('[properties/browse] RPC unavailable, using no-images select + cover enrich', {
        message: rpcResult.error.message,
        code: rpcResult.error.code,
      });

      let result = await fetchWithoutImages(
        supabase,
        PROPERTY_BROWSE_NO_IMAGES_SELECT,
        limitParam
      );
      if (result.error) {
        console.error('[properties/browse] primary no-images failed', result.error);
        result = await fetchWithoutImages(
          supabase,
          PROPERTY_BROWSE_NO_IMAGES_FALLBACK,
          limitParam
        );
      }
      if (result.error) {
        console.error('[properties/browse] fallback no-images failed', result.error);
        result = await fetchWithoutImages(
          supabase,
          PROPERTY_BROWSE_MINIMAL_SELECT,
          limitParam
        );
      }
      if (result.error) {
        return NextResponse.json(
          {
            error: result.error.message,
            code: result.error.code,
            details: result.error.details,
            hint: result.error.hint,
          },
          { status: 500 }
        );
      }
      rows = withCardImages(result.rows);
      if (missingHttpCovers(rows)) {
        rows = await enrichCoverImages(supabase, rows);
      }
      usedFallback = true;
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
