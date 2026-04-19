import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSmokingFlags } from '@/lib/propertySmoking';

export type FeaturedRetreatPublic = {
  id: string;
  name: string;
  location: string;
  description: string;
  rating: number;
  reviews: number;
  price: number;
  images: string[];
  amenities: string[];
  badge: string;
  bedrooms: number;
  guests: number;
  type?: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl: string;
  wellnessFriendly?: boolean;
  smokingInsideAllowed?: boolean;
  smokingOutsideAllowed?: boolean;
};

export function clampDisplayCount(n: unknown): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 6;
  return Math.min(24, Math.max(1, x));
}

export function uniqueOrderedIds(ids: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const t = String(raw ?? '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

async function fetchReviewScores(supabase: SupabaseClient) {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('property_id, rating')
    .eq('status', 'approved');
  if (error) throw error;
  const byProp = new Map<string, { count: number; sum: number }>();
  for (const row of reviews || []) {
    const pid = String((row as { property_id: string }).property_id);
    const rating = Number((row as { rating: number }).rating) || 0;
    const cur = byProp.get(pid) || { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += rating;
    byProp.set(pid, cur);
  }
  return [...byProp.entries()]
    .map(([id, { count, sum }]) => ({ id, count, avg: count ? sum / count : 0 }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg);
}

async function pickFallbackIds(
  supabase: SupabaseClient,
  limit: number,
  exclude: Set<string>
): Promise<string[]> {
  if (limit <= 0) return [];

  try {
    const scored = await fetchReviewScores(supabase);
    const orderedCandidateIds = scored.map((s) => s.id).filter((id) => !exclude.has(id));

    const scan = Math.min(500, Math.max(orderedCandidateIds.length, limit * 20));
    const slice = orderedCandidateIds.slice(0, scan);
    let activeSet = new Set<string>();
    if (slice.length > 0) {
      const { data: activeRows } = await supabase.from('properties').select('id').eq('status', 'active').in('id', slice);
      activeSet = new Set((activeRows || []).map((r: { id: string }) => r.id));
    }

    const filtered = orderedCandidateIds.filter((id) => activeSet.has(id)).slice(0, limit);
    if (filtered.length >= limit) return filtered;

    const used = new Set<string>([...exclude, ...filtered]);
    const { data: byRating } = await supabase
      .from('properties')
      .select('id, rating')
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .limit(120);

    for (const row of byRating || []) {
      const id = String((row as { id: string }).id);
      if (used.has(id)) continue;
      filtered.push(id);
      used.add(id);
      if (filtered.length >= limit) break;
    }

    return filtered.slice(0, limit);
  } catch {
    const { data: byRating } = await supabase
      .from('properties')
      .select('id')
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .limit(limit + exclude.size + 10);
    const out: string[] = [];
    for (const row of byRating || []) {
      const id = String((row as { id: string }).id);
      if (exclude.has(id)) continue;
      out.push(id);
      if (out.length >= limit) break;
    }
    return out;
  }
}

async function loadActivePropertiesInOrder(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [] as Record<string, unknown>[];
  const { data, error } = await supabase.from('properties').select('*').in('id', ids);
  if (error) throw error;
  const byId = new Map<string, Record<string, unknown>>();
  for (const p of data || []) {
    byId.set(String((p as { id: string }).id), p as Record<string, unknown>);
  }
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Record<string, unknown> => {
      if (!p) return false;
      return String(p.status) === 'active';
    });
}

async function loadReviewCountsForProperties(supabase: SupabaseClient, propertyIds: string[]) {
  const map = new Map<string, { count: number; avg: number }>();
  if (propertyIds.length === 0) return map;
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('property_id, rating')
    .eq('status', 'approved')
    .in('property_id', propertyIds);
  if (error) return map;
  const acc = new Map<string, { count: number; sum: number }>();
  for (const row of reviews || []) {
    const pid = String((row as { property_id: string }).property_id);
    const rating = Number((row as { rating: number }).rating) || 0;
    const cur = acc.get(pid) || { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += rating;
    acc.set(pid, cur);
  }
  for (const [pid, { count, sum }] of acc) {
    map.set(pid, { count, avg: count ? sum / count : 0 });
  }
  return map;
}

function mapRowToRetreat(
  p: Record<string, unknown>,
  profile: { avatar_url: string | null; full_name: string | null } | undefined,
  reviewCount: number,
  reviewAvg: number
): FeaturedRetreatPublic {
  const hostId = String(p.host_id || '');
  const hostName = (profile?.full_name || 'Host').trim() || 'Host';
  const hostAvatarUrl =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(hostId || hostName)}`;

  const rawDesc = typeof p.description === 'string' ? p.description.trim() : '';
  const description = rawDesc.length > 220 ? `${rawDesc.slice(0, 217).trimEnd()}…` : rawDesc;

  const ratingCol = p.rating != null ? Number(p.rating) : NaN;
  const displayRating =
    reviewCount > 0 ? Math.round(reviewAvg * 10) / 10 : Number.isFinite(ratingCol) ? ratingCol : 4.5;

  const smoking = resolveSmokingFlags(p);

  return {
    id: String(p.id),
    name: String(p.name || p.title || 'Property'),
    location: String(p.location || ''),
    description,
    rating: displayRating,
    reviews: reviewCount,
    price: p.price != null ? Number(p.price) : 0,
    images: Array.isArray(p.images) ? (p.images as string[]).filter(Boolean) : [],
    amenities: Array.isArray(p.amenities) ? (p.amenities as string[]).slice(0, 2) : [],
    badge: p.wellness_friendly ? 'Wellness-friendly' : 'Featured',
    bedrooms: Number(p.bedrooms) || 1,
    guests: Number(p.guests) || 2,
    type: p.type ? String(p.type) : '',
    hostId,
    hostName,
    hostAvatarUrl,
    wellnessFriendly: p.wellness_friendly === true,
    smokingInsideAllowed: smoking.inside,
    smokingOutsideAllowed: smoking.outside,
  };
}

async function legacyWellnessRetreats(supabase: SupabaseClient, limit: number): Promise<FeaturedRetreatPublic[]> {
  const { data: propertiesData, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'active')
    .eq('wellness_friendly', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !propertiesData?.length) return [];

  const rows = propertiesData as Record<string, unknown>[];
  const hostIds = [...new Set(rows.map((p) => p.host_id).filter(Boolean))] as string[];
  const profileById: Record<string, { avatar_url: string | null; full_name: string | null }> = {};
  if (hostIds.length > 0) {
    const { data: profilesData } = await supabase.from('profiles').select('id, avatar_url, full_name').in('id', hostIds);
    (profilesData || []).forEach((row: { id: string; avatar_url: string | null; full_name: string | null }) => {
      profileById[row.id] = { avatar_url: row.avatar_url, full_name: row.full_name };
    });
  }

  const ids = rows.map((r) => String(r.id));
  const reviewMap = await loadReviewCountsForProperties(supabase, ids);

  return rows.map((p) => {
    const hostId = String(p.host_id || '');
    const rev = reviewMap.get(String(p.id));
    return mapRowToRetreat(p, hostId ? profileById[hostId] : undefined, rev?.count ?? 0, rev?.avg ?? 0);
  });
}

export type FeaturedResolveSource = 'manual' | 'mixed' | 'auto' | 'legacy';

export async function resolveFeaturedRetreatsForHome(supabase: SupabaseClient): Promise<{
  retreats: FeaturedRetreatPublic[];
  source: FeaturedResolveSource;
  displayCount: number;
}> {
  const defaultLimit = 6;

  const { data: cfgRow, error: cfgError } = await supabase
    .from('featured_retreats_config')
    .select('property_ids, display_count')
    .eq('id', 'default')
    .maybeSingle();

  if (cfgError || !cfgRow) {
    const retreats = await legacyWellnessRetreats(supabase, defaultLimit);
    return { retreats, source: 'legacy', displayCount: defaultLimit };
  }

  const displayCount = clampDisplayCount((cfgRow as { display_count?: number }).display_count);
  const manualIds = uniqueOrderedIds(
    Array.isArray((cfgRow as { property_ids?: unknown[] }).property_ids)
      ? ((cfgRow as { property_ids: unknown[] }).property_ids as unknown[])
      : []
  );

  let source: FeaturedResolveSource = 'auto';
  let finalRows: Record<string, unknown>[] = [];

  if (manualIds.length === 0) {
    const ids = await pickFallbackIds(supabase, displayCount, new Set());
    finalRows = await loadActivePropertiesInOrder(supabase, ids);
    source = 'auto';
  } else {
    const target = manualIds.slice(0, displayCount);
    let rows = await loadActivePropertiesInOrder(supabase, target);

    if (rows.length === 0) {
      const ids = await pickFallbackIds(supabase, displayCount, new Set());
      finalRows = await loadActivePropertiesInOrder(supabase, ids);
      source = 'auto';
    } else {
      source = 'manual';
      if (rows.length < displayCount) {
        const exclude = new Set(rows.map((r) => String(r.id)));
        const need = displayCount - rows.length;
        const fillerIds = await pickFallbackIds(supabase, need, exclude);
        if (fillerIds.length > 0) source = 'mixed';
        const extra = await loadActivePropertiesInOrder(supabase, fillerIds);
        const seen = new Set(rows.map((r) => String(r.id)));
        for (const r of extra) {
          const id = String(r.id);
          if (seen.has(id)) continue;
          rows.push(r);
          seen.add(id);
          if (rows.length >= displayCount) break;
        }
      }
      finalRows = rows.slice(0, displayCount);
    }
  }

  const orderedIds = finalRows.map((r) => String(r.id));
  const reviewMap = await loadReviewCountsForProperties(supabase, orderedIds);
  const hostIds = [...new Set(finalRows.map((p) => p.host_id).filter(Boolean))] as string[];
  const profileById: Record<string, { avatar_url: string | null; full_name: string | null }> = {};
  if (hostIds.length > 0) {
    const { data: profilesData } = await supabase.from('profiles').select('id, avatar_url, full_name').in('id', hostIds);
    (profilesData || []).forEach((row: { id: string; avatar_url: string | null; full_name: string | null }) => {
      profileById[row.id] = { avatar_url: row.avatar_url, full_name: row.full_name };
    });
  }

  const retreats = orderedIds
    .map((id) => finalRows.find((r) => String(r.id) === id))
    .filter(Boolean)
    .map((p) => {
      const row = p as Record<string, unknown>;
      const id = String(row.id);
      const hostId = String(row.host_id || '');
      const rev = reviewMap.get(id);
      return mapRowToRetreat(row, hostId ? profileById[hostId] : undefined, rev?.count ?? 0, rev?.avg ?? 0);
    });

  return { retreats, source, displayCount };
}
