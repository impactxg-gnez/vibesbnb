import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cityLabelFromPropertyLocation } from '@/lib/propertyLocationCity';

function escapeIlikeWildcards(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

type PropRow = { id: string; name: string | null; title: string | null; location: string | null };

/**
 * Typeahead for travellers: active properties by name, title, or location.
 * GET ?q=search&limit=10
 */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey || url.includes('placeholder')) {
    return NextResponse.json({ suggestions: [] as unknown[] });
  }

  const raw = (request.nextUrl.searchParams.get('q') || '').trim().replace(/"/g, '').slice(0, 120);
  if (raw.length < 1) {
    return NextResponse.json({ suggestions: [] as unknown[] });
  }

  const limRaw = request.nextUrl.searchParams.get('limit');
  const limit = Math.min(20, Math.max(1, parseInt(limRaw || '10', 10) || 10));

  const safe = escapeIlikeWildcards(raw.replace(/,/g, ' '));
  const pattern = `%${safe}%`;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sel = 'id, name, title, location';
  const perColumnLimit = Math.min(limit + 5, 24);

  const run = (column: 'name' | 'title' | 'location') =>
    supabase
      .from('properties')
      .select(sel)
      .eq('status', 'active')
      .ilike(column, pattern)
      .limit(perColumnLimit);

  const [n, t, l] = await Promise.all([run('name'), run('title'), run('location')]);

  const err = n.error || t.error || l.error;
  if (err) {
    console.error('[properties/suggest]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const map = new Map<string, PropRow>();
  for (const batch of [n, t, l]) {
    for (const row of (batch.data ?? []) as PropRow[]) {
      if (row?.id != null) map.set(String(row.id), row);
    }
  }
  const rows = Array.from(map.values()).slice(0, limit);

  const suggestions = rows.map((r) => {
    const displayName = (r.name || r.title || 'Property').trim() || 'Property';
    const rawLoc = (r.location || '').trim();
    return {
      id: String(r.id),
      name: displayName,
      location: cityLabelFromPropertyLocation(rawLoc) || rawLoc,
    };
  });

  return NextResponse.json({ suggestions });
}
