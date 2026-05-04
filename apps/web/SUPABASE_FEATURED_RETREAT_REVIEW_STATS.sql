-- Aggregates review counts/avgs for homepage featured cards without loading every row.
-- Run in Supabase SQL Editor (see featured-retreats API + featuredRetreatsResolve.ts).

CREATE OR REPLACE FUNCTION public.featured_retreat_review_stats(p_property_ids text[])
RETURNS TABLE (
  property_id text,
  review_count bigint,
  rating_avg numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.property_id,
         COUNT(*)::bigint,
         AVG(r.rating::numeric)::numeric
  FROM public.reviews r
  WHERE r.status = 'approved'
    AND r.property_id = ANY (p_property_ids)
  GROUP BY r.property_id;
$$;

REVOKE ALL ON FUNCTION public.featured_retreat_review_stats(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.featured_retreat_review_stats(text[]) TO service_role;
