import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSmokingFlags } from '@/lib/propertySmoking';
import { resolveWellnessConsumptionFlags } from '@/lib/wellnessConsumption';
import { PROPERTY_FEATURED_LIST_COLUMNS } from '@/lib/propertyPublicSelect';

/** Hard cap for homepage Featured Vibes cards. */
export const FEATURED_VIBES_HOME_LIMIT = 6;

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
  bathrooms: number;
  guests: number;
  type?: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl: string;
  wellnessFriendly?: boolean;
  wellnessConsumptionIndoorAllowed?: boolean;
  wellnessConsumptionOutdoorAllowed?: boolean;
  smokingInsideAllowed?: boolean;
  smokingOutsideAllowed?: boolean;
};

export function clampDisplayCount(n: unknown): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return FEATURED_VIBES_HOME_LIMIT;
  return Math.min(FEATURED_VIBES_HOME_LIMIT, Math.max(1, x));
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

/** Highest-rated active listings (rating → review volume → newest). */
async function pickFallbackIds(
  supabase: SupabaseClient,
  limit: number,
  exclude: Set<string>
): Promise<string[]> {
  if (limit <= 0) return [];

  const fetchCap = Math.min(80, limit + exclude.size + 24);
  const collect = (rows: { id: string }[] | null | undefined) => {
    const out: string[] = [];
    for (const row of rows || []) {
      const id = String(row.id);
      if (exclude.has(id)) continue;
      out.push(id);
      if (out.length >= limit) break;
    }
    return out;
  };

  // Prefer rating + reviews_count; fall back if reviews_count is unavailable
  const primary = await supabase
    .from('properties')
    .select('id')
    .eq('status', 'active')
    .order('rating', { ascending: false })
    .order('reviews_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(fetchCap);

  if (!primary.error) {
    const out = collect(primary.data as { id: string }[] | null);
    if (out.length >= limit || out.length > 0) return out;
  } else {
    console.warn('[featuredRetreatsResolve] fallback query:', primary.error.message);
  }

  const byRating = await supabase
    .from('properties')
    .select('id')
    .eq('status', 'active')
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(fetchCap);

  if (!byRating.error) {
    return collect(byRating.data as { id: string }[] | null);
  }

  const recent = await supabase
    .from('properties')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(fetchCap);

  return collect(recent.data as { id: string }[] | null);
}

async function loadActivePropertiesInOrder(supabase: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [] as Record<string, unknown>[];
  const { data, error } = await supabase.from('properties').select(PROPERTY_FEATURED_LIST_COLUMNS).in('id', ids);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]) ?? [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const p of rows) {
    byId.set(String(p.id), p);
  }
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Record<string, unknown> => {
      if (!p) return false;
      return String(p.status) === 'active';
    });
}

function mapRowToRetreat(
  p: Record<string, unknown>,
  profile: { avatar_url: string | null; full_name: string | null } | undefined
): FeaturedRetreatPublic {
  const hostId = String(p.host_id || '');
  const hostName = (profile?.full_name || 'Host').trim() || 'Host';
  const hostAvatarUrl =
    profile?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(hostId || hostName)}`;

  const rawDesc = typeof p.description === 'string' ? p.description.trim() : '';
  const description = rawDesc.length > 180 ? `${rawDesc.slice(0, 177).trimEnd()}…` : rawDesc;

  const ratingCol = p.rating != null ? Number(p.rating) : NaN;
  const reviewsCount = Number(p.reviews_count) || 0;
  const displayRating = Number.isFinite(ratingCol) ? Math.round(ratingCol * 10) / 10 : 0;

  const smoking = resolveSmokingFlags(p);
  const consumption = resolveWellnessConsumptionFlags(p);

  return {
    id: String(p.id),
    name: String(p.name || p.title || 'Property'),
    location: String(p.location || ''),
    description,
    rating: displayRating,
    reviews: reviewsCount,
    price: p.price != null ? Number(p.price) : 0,
    // Cap carousel payload — cards only need a few frames
    images: Array.isArray(p.images) ? (p.images as string[]).filter(Boolean).slice(0, 6) : [],
    amenities: Array.isArray(p.amenities) ? (p.amenities as string[]).slice(0, 2) : [],
    badge: p.wellness_friendly ? 'Wellness-friendly' : 'Featured',
    bedrooms: Number(p.bedrooms) || 1,
    bathrooms: (() => {
      const b = Number(p.bathrooms);
      return Number.isFinite(b) && b >= 0 ? b : 1;
    })(),
    guests: Number(p.guests) || 2,
    type: p.type ? String(p.type) : '',
    hostId,
    hostName,
    hostAvatarUrl,
    wellnessFriendly: p.wellness_friendly === true,
    wellnessConsumptionIndoorAllowed: consumption.indoor,
    wellnessConsumptionOutdoorAllowed: consumption.outdoor,
    smokingInsideAllowed: smoking.inside,
    smokingOutsideAllowed: smoking.outside,
  };
}

export type FeaturedResolveSource = 'manual' | 'mixed' | 'auto';

export async function resolveFeaturedRetreatsForHome(supabase: SupabaseClient): Promise<{
  retreats: FeaturedRetreatPublic[];
  source: FeaturedResolveSource;
  displayCount: number;
}> {
  const displayCount = FEATURED_VIBES_HOME_LIMIT;

  const { data: cfgRow, error: cfgError } = await supabase
    .from('featured_retreats_config')
    .select('property_ids, display_count')
    .eq('id', 'default')
    .maybeSingle();

  const manualIds =
    !cfgError && cfgRow
      ? uniqueOrderedIds(
          Array.isArray((cfgRow as { property_ids?: unknown[] }).property_ids)
            ? ((cfgRow as { property_ids: unknown[] }).property_ids as unknown[])
            : []
        ).slice(0, FEATURED_VIBES_HOME_LIMIT)
      : [];

  let source: FeaturedResolveSource = 'auto';
  let finalRows: Record<string, unknown>[] = [];

  if (manualIds.length === 0) {
    const ids = await pickFallbackIds(supabase, displayCount, new Set());
    finalRows = await loadActivePropertiesInOrder(supabase, ids);
    source = 'auto';
  } else {
    let rows = await loadActivePropertiesInOrder(supabase, manualIds);

    if (rows.length === 0) {
      const ids = await pickFallbackIds(supabase, displayCount, new Set());
      finalRows = await loadActivePropertiesInOrder(supabase, ids);
      source = 'auto';
    } else {
      source = 'manual';
      // Always fill remaining slots so home shows up to 6 cards
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

  finalRows = finalRows.slice(0, displayCount);

  const hostIds = [...new Set(finalRows.map((p) => p.host_id).filter(Boolean))] as string[];
  const profileById: Record<string, { avatar_url: string | null; full_name: string | null }> = {};
  if (hostIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, avatar_url, full_name')
      .in('id', hostIds);
    (profilesData || []).forEach((row: { id: string; avatar_url: string | null; full_name: string | null }) => {
      profileById[row.id] = { avatar_url: row.avatar_url, full_name: row.full_name };
    });
  }

  const retreats = finalRows.map((row) => {
    const hostId = String(row.host_id || '');
    return mapRowToRetreat(row, hostId ? profileById[hostId] : undefined);
  });

  return { retreats, source, displayCount };
}
