import type { SupabaseClient } from '@supabase/supabase-js';
import type { HostReviewStats } from '@/lib/hostBadge';

const EMPTY_STATS: HostReviewStats = { reviewCount: 0, avgRating: 0 };

/**
 * Aggregates approved guest reviews across all of a host's properties.
 */
export async function fetchHostReviewStats(
  supabase: SupabaseClient,
  hostId: string
): Promise<HostReviewStats> {
  if (!hostId) return EMPTY_STATS;

  const { data: properties, error: propErr } = await supabase
    .from('properties')
    .select('id')
    .eq('host_id', hostId);

  if (propErr || !properties?.length) return EMPTY_STATS;

  const propertyIds = properties
    .map((p) => p.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (propertyIds.length === 0) return EMPTY_STATS;

  const { data: reviews, error: revErr } = await supabase
    .from('reviews')
    .select('rating')
    .in('property_id', propertyIds)
    .eq('status', 'approved');

  if (revErr || !reviews?.length) return EMPTY_STATS;

  const ratings = reviews
    .map((r) => Number(r.rating))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);

  if (ratings.length === 0) return EMPTY_STATS;

  const sum = ratings.reduce((acc, n) => acc + n, 0);
  const avgRating = Number((sum / ratings.length).toFixed(2));

  return { reviewCount: ratings.length, avgRating };
}
