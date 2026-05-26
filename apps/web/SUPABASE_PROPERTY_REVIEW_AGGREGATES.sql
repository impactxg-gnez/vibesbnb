-- =============================================================================
-- Keep properties.rating + reviews_count + has_team_review in sync with reviews
-- =============================================================================
-- This makes admin/VibesBNB reviews immediately reflected on property cards.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS has_team_review boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN properties.reviews_count IS
  'Approved reviews count for this property (denormalized for fast listing cards).';

COMMENT ON COLUMN properties.has_team_review IS
  'True when an approved VibesBNB team review exists for this property.';

CREATE OR REPLACE FUNCTION public.recompute_property_review_stats(pid text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating numeric;
  cnt integer;
  has_team boolean;
BEGIN
  SELECT
    COALESCE(AVG(rating)::numeric, 0),
    COALESCE(COUNT(*)::int, 0),
    COALESCE(BOOL_OR(is_team_review IS TRUE), false)
  INTO avg_rating, cnt, has_team
  FROM public.reviews
  WHERE property_id = pid
    AND status = 'approved';

  UPDATE public.properties
    SET rating = ROUND(avg_rating::numeric, 1),
        reviews_count = cnt,
        has_team_review = has_team,
        updated_at = NOW()
  WHERE id = pid;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_recompute_property_review_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_property_review_stats(OLD.property_id);
    RETURN OLD;
  END IF;

  -- INSERT / UPDATE: handle property_id changes too
  PERFORM public.recompute_property_review_stats(NEW.property_id);
  IF TG_OP = 'UPDATE' AND OLD.property_id IS DISTINCT FROM NEW.property_id THEN
    PERFORM public.recompute_property_review_stats(OLD.property_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_recompute_property_stats ON public.reviews;
CREATE TRIGGER reviews_recompute_property_stats
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_property_review_stats();

-- Backfill existing properties once
DO $$
DECLARE
  pid text;
BEGIN
  FOR pid IN SELECT id FROM public.properties LOOP
    PERFORM public.recompute_property_review_stats(pid);
  END LOOP;
END $$;

SELECT 'Property review aggregates enabled.' AS status;

