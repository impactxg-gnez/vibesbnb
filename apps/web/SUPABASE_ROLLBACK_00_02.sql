-- =============================================================================
-- ROLLBACK: reverses SUPABASE_00_SCHEMA_BOOTSTRAP + ADMIN_REALTIME_RLS + REVIEWS_UPDATE
-- =============================================================================
-- Run this ONLY on the Supabase project where you ran those 3 scripts by mistake.
-- Do NOT run on production if you want to keep team reviews / admin RLS.
--
-- Order: this file runs all steps top → bottom (reverse of the original 3 files).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Roll back SUPABASE_REVIEWS_UPDATE.sql
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.reviews') IS NULL THEN
    RAISE NOTICE 'reviews table not found — skipping section 1';
    RETURN;
  END IF;

  DELETE FROM public.reviews WHERE is_team_review = true OR user_id IS NULL;

  DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
  DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
  DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
  DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
  DROP POLICY IF EXISTS "Admins can update all reviews" ON public.reviews;
  DROP POLICY IF EXISTS "Admins can insert team reviews" ON public.reviews;
  DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;

  CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
    FOR SELECT USING (status = 'approved');
  CREATE POLICY "Authenticated users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

  ALTER TABLE public.reviews DROP COLUMN IF EXISTS is_team_review;
  ALTER TABLE public.reviews DROP COLUMN IF EXISTS reviewer_name;

  IF NOT EXISTS (SELECT 1 FROM public.reviews WHERE user_id IS NULL) THEN
    ALTER TABLE public.reviews ALTER COLUMN user_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'reviews.user_id still has NULL rows — NOT NULL not re-applied';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Roll back SUPABASE_ADMIN_REALTIME_RLS.sql
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can view all pending host applications (jwt)" ON public.pending_host_applications;
DROP POLICY IF EXISTS "Admins can update pending host applications (jwt)" ON public.pending_host_applications;
DROP POLICY IF EXISTS "Admins can view all profile pictures" ON public.pending_profile_pictures;
DROP POLICY IF EXISTS "Admins can update profile pictures" ON public.pending_profile_pictures;
DROP POLICY IF EXISTS "Admins can read all dispensaries" ON public.dispensaries;
DROP POLICY IF EXISTS "Admins can update dispensaries" ON public.dispensaries;
DROP POLICY IF EXISTS "Admins can delete dispensaries" ON public.dispensaries;

DROP FUNCTION IF EXISTS public.is_vibesbnb_admin_jwt();

-- Remove tables from Realtime publication (only if they were added by the migration)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'bookings',
    'properties',
    'pending_host_applications',
    'pending_profile_pictures',
    'dispensaries',
    'reviews'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
        RAISE NOTICE 'Removed % from supabase_realtime', t;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not drop % from realtime: %', t, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) OPTIONAL: Roll back SUPABASE_00_SCHEMA_BOOTSTRAP.sql
-- ---------------------------------------------------------------------------
-- Uncomment the block below ONLY if bootstrap created empty tables on a blank/wrong
-- project and you want them gone. This DELETES DATA in those tables.
--
-- Do NOT uncomment if this project already had real bookings/properties before bootstrap.

/*
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;

-- profiles / properties often existed before bootstrap — drop only if you are sure:
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.properties CASCADE;
*/

SELECT 'Rollback complete (reviews + admin RLS). Uncomment section 3 to drop bootstrap tables.' AS status;
