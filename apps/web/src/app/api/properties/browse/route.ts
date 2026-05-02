import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { PROPERTY_PUBLIC_LIST_COLUMNS } from '@/lib/propertyPublicSelect';

/** POSTgREST-safe chunk size for `in()` profile lookups */
const HOST_ID_CHUNK = 80;

/** Optional cap when clients only need a handful (homepage rows). Uncapped when omitted (search/map). */
const MAX_LIMIT_CAP = 48;

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

  try {
    const supabase = createBrowserClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase
      .from('properties')
      .select(PROPERTY_PUBLIC_LIST_COLUMNS)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (limitParam !== undefined) {
      query = query.limit(limitParam);
    }

    const { data: propertiesRaw, error: pErr } = await query;

    if (pErr) {
      console.error('[properties/browse]', pErr);
      return NextResponse.json({ error: pErr.message }, { status: 500 });
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
      for (let i = 0; i < hostIds.length; i += HOST_ID_CHUNK) {
        const slice = hostIds.slice(i, i + HOST_ID_CHUNK);
        const { data: profSlice, error: prErr } = await supabase
          .from('profiles')
          .select('id, avatar_url, full_name')
          .in('id', slice);

        if (prErr) {
          console.error('[properties/browse] profiles chunk', prErr);
          continue;
        }
        if (profSlice?.length) profiles.push(...(profSlice as Record<string, unknown>[]));
      }
    }

    return NextResponse.json(
      { properties: rows, profiles },
      {
        headers: {
          'Cache-Control':
            limitParam !== undefined
              ? 'public, s-maxage=60, stale-while-revalidate=300'
              : 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (e: unknown) {
    console.error('[properties/browse]', e);
    return NextResponse.json({ error: 'Browse failed' }, { status: 500 });
  }
}
