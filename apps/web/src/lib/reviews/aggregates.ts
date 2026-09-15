import type { SupabaseClient } from '@supabase/supabase-js';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

export async function recomputePropertyReviewAggregates(
  supabase: SupabaseClient,
  propertyId: string
): Promise<void> {
  const { data: approvedRows, error: aggErr } = await supabase
    .from('reviews')
    .select('rating,is_team_review')
    .eq('property_id', propertyId)
    .eq('status', 'approved');

  if (aggErr || !approvedRows) {
    if (aggErr) console.warn('[recomputePropertyReviewAggregates]', aggErr);
    return;
  }

  const count = approvedRows.length;
  const avg =
    count > 0
      ? approvedRows.reduce((sum, r: { rating?: number }) => sum + (Number(r.rating) || 0), 0) / count
      : 0;
  const hasTeam = approvedRows.some(
    (r: { is_team_review?: boolean }) => r.is_team_review === true
  );

  await supabase
    .from('properties')
    .update({
      rating: Number.isFinite(avg) ? Number(avg.toFixed(1)) : 0,
      reviews_count: count,
      has_team_review: hasTeam,
      updated_at: new Date().toISOString(),
    })
    .eq('id', propertyId);

  try {
    await invalidatePropertyListingCaches(propertyId);
  } catch {
    /* ignore */
  }
}
