import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient, type SupabaseClient } from '@supabase/supabase-js';
import { getRedis } from '@/lib/cache/redis';
import { redisGetJson, redisSetJson } from '@/lib/cache/redisJson';
import { browseCacheKey, bumpCacheStat } from '@/lib/cache/invalidation';
import { logApiPerf } from '@/lib/monitoring/apiPerf';

const HOST_ID_CHUNK = 80;
const MAX_LIMIT_CAP = 100;
const BROWSE_PAGE_SIZE = 40;
/** Redis TTL for slim cover-only payloads (seconds). */
const BROWSE_REDIS_TTL_SEC = 300;

/**
 * Card fields without `images` / heavy arrays — full image arrays are huge
 * (50–200+ URLs / base64) and cause statement timeouts on uncapped browse.
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
  if (trimmed.length < 12 || trimmed.length > 2000) return false;
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false;
  if (lower.startsWith('data:')) return false;
  if (lower.includes('via.placeholder')) return false;
  if (lower.includes('photo-1542718610')) return false;
  return true;
}

function firstHttpCover(images: unknown, cover?: unknown): string | null {
  if (typeof cover === 'string' && isHttpCoverUrl(cover)) return cover.trim();
  if (Array.isArray(images)) {
    for (const raw of images) {
      if (typeof raw === 'string' && isHttpCoverUrl(raw)) return raw.trim();
    }
  }
  return null;
}

/**
 * Strip every heavy field. Cards get at most one http cover or the /cover proxy.
 * Never return data: URLs or multi-image galleries in browse JSON.
 */
function slimBrowseRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const id = typeof r.id === 'string' ? r.id : '';
    const cover = firstHttpCover(r.images, r.cover_image ?? r.cover_images);
    const images = cover
      ? [cover]
      : id
        ? [`/api/properties/${encodeURIComponent(id)}/cover`]
        : [];

    // Explicit allowlist — drop images[], rooms, description blobs, etc.
    return {
      id: r.id,
      host_id: r.host_id,
      name: r.name,
      title: r.title,
      location: r.location,
      price: r.price,
      rating: r.rating,
      reviews_count: r.reviews_count,
      has_team_review: r.has_team_review,
      type: r.type,
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      guests: r.guests,
      status: r.status,
      created_at: r.created_at,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      beds: r.beds,
      wellness_friendly: r.wellness_friendly,
      wellness_consumption_indoor_allowed: r.wellness_consumption_indoor_allowed,
      wellness_consumption_outdoor_allowed: r.wellness_consumption_outdoor_allowed,
      latitude: r.latitude,
      longitude: r.longitude,
      smoking_inside_allowed: r.smoking_inside_allowed,
      smoking_outside_allowed: r.smoking_outside_allowed,
      smoke_friendly: r.smoke_friendly,
      min_booking_nights: r.min_booking_nights,
      cover_image: cover,
      images,
    };
  });
}

/** Reject stale Redis payloads that still embed base64 galleries. */
function isSlimBrowseCache(parsed: { properties?: unknown[] } | null): boolean {
  if (!parsed?.properties || !Array.isArray(parsed.properties)) return false;
  const sample = parsed.properties.slice(0, 8) as Record<string, unknown>[];
  for (const row of sample) {
    const imgs = row.images;
    if (!Array.isArray(imgs)) continue;
    if (imgs.length > 3) return false;
    for (const u of imgs) {
      if (typeof u !== 'string') return false;
      if (u.startsWith('data:') || u.length > 2500) return false;
    }
  }
  return true;
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
        if (parsed?.properties && isSlimBrowseCache(parsed)) {
          await bumpCacheStat('hit');
          logApiPerf('GET /api/properties/browse', Date.now() - started, {
            cache: 'hit',
            limit: browseLimitKey,
          });
          return NextResponse.json(parsed, {
            headers: {
              'Cache-Control':
                limitParam !== undefined
                  ? 'public, s-maxage=300, stale-while-revalidate=900'
                  : 'public, s-maxage=180, stale-while-revalidate=600',
              'X-Cache': 'redis-hit',
            },
          });
        }
        if (parsed?.properties && !isSlimBrowseCache(parsed)) {
          console.warn('[properties/browse] ignoring fat redis cache', bKey);
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

    // Slim PostgREST select only — never call fat image RPCs on the hot path.
    let result = await fetchWithoutImages(
      supabase,
      PROPERTY_BROWSE_NO_IMAGES_SELECT,
      limitParam
    );
    if (result.error) {
      console.warn('[properties/browse] cover_image select failed, trying fallback', {
        message: result.error.message,
        code: result.error.code,
      });
      result = await fetchWithoutImages(
        supabase,
        PROPERTY_BROWSE_NO_IMAGES_FALLBACK,
        limitParam
      );
    }
    if (result.error) {
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

    rows = slimBrowseRows(result.rows);
    usedFallback = true;

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

    // Hard fail-closed: never ship multi-MB gallery/base64 browse responses.
    const approx = JSON.stringify(payload).length;
    if (approx > 1_500_000) {
      console.error('[properties/browse] payload still too large after slim', {
        bytes: approx,
        rows: rows.length,
      });
      return NextResponse.json(
        {
          error: 'Browse payload too large',
          code: 'BROWSE_PAYLOAD_TOO_LARGE',
          hint: 'Re-run SUPABASE_BROWSE_ACTIVE_PROPERTY_CARDS.sql and ensure cover_image is populated.',
        },
        { status: 503 }
      );
    }

    if (redis) {
      try {
        await redisSetJson(redis, bKey, payload, { ex: BROWSE_REDIS_TTL_SEC });
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
        // Avoid CDN caching fat legacy payloads for long.
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        'X-Browse-Slim': '1',
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
