-- Admin Realtime (postgres_changes): run in Supabase SQL Editor
--
-- PREREQUISITE: Run SUPABASE_00_SCHEMA_BOOTSTRAP.sql first if you saw
--   "relation bookings does not exist" or "relation reviews does not exist".
--
-- Keep the email list inside is_vibesbnb_admin_jwt() in sync with
-- apps/web/src/lib/auth/isAdmin.ts (ADMIN_EMAILS).

-- ---------------------------------------------------------------------------
-- JWT helper: role = admin OR allowlisted admin email
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_vibesbnb_admin_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR lower(trim(coalesce(auth.jwt() ->> 'email', ''))) IN (
      'admin@vibesbnb.com',
      'info@vibesbnb.com',
      'vibewithdeon@vibesbnb.com',
      'keval65@gmail.com',
      'mrdeonmack@gmail.com'
    );
$$;

REVOKE ALL ON FUNCTION public.is_vibesbnb_admin_jwt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_vibesbnb_admin_jwt() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: admins can read all rows (only on tables that exist)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
    CREATE POLICY "Admins can view all bookings"
      ON public.bookings FOR SELECT
      USING (public.is_vibesbnb_admin_jwt());
  END IF;

  IF to_regclass('public.properties') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
    CREATE POLICY "Admins can view all properties"
      ON public.properties FOR SELECT
      USING (public.is_vibesbnb_admin_jwt());
  END IF;

  IF to_regclass('public.pending_host_applications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all pending host applications (jwt)" ON public.pending_host_applications;
    CREATE POLICY "Admins can view all pending host applications (jwt)"
      ON public.pending_host_applications FOR SELECT
      USING (public.is_vibesbnb_admin_jwt());

    DROP POLICY IF EXISTS "Admins can update pending host applications (jwt)" ON public.pending_host_applications;
    CREATE POLICY "Admins can update pending host applications (jwt)"
      ON public.pending_host_applications FOR UPDATE
      USING (public.is_vibesbnb_admin_jwt());
  END IF;

  IF to_regclass('public.pending_profile_pictures') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all profile pictures" ON public.pending_profile_pictures;
    CREATE POLICY "Admins can view all profile pictures"
      ON public.pending_profile_pictures FOR SELECT
      USING (public.is_vibesbnb_admin_jwt());

    DROP POLICY IF EXISTS "Admins can update profile pictures" ON public.pending_profile_pictures;
    CREATE POLICY "Admins can update profile pictures"
      ON public.pending_profile_pictures FOR UPDATE
      USING (public.is_vibesbnb_admin_jwt());
  END IF;

  IF to_regclass('public.dispensaries') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can read all dispensaries" ON public.dispensaries;
    DROP POLICY IF EXISTS "Admins can update dispensaries" ON public.dispensaries;
    DROP POLICY IF EXISTS "Admins can delete dispensaries" ON public.dispensaries;
    CREATE POLICY "Admins can read all dispensaries"
      ON public.dispensaries FOR SELECT
      USING (public.is_vibesbnb_admin_jwt());
    CREATE POLICY "Admins can update dispensaries"
      ON public.dispensaries FOR UPDATE
      USING (public.is_vibesbnb_admin_jwt());
    CREATE POLICY "Admins can delete dispensaries"
      ON public.dispensaries FOR DELETE
      USING (public.is_vibesbnb_admin_jwt());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Realtime publication (idempotent — skips missing tables)
-- ---------------------------------------------------------------------------

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
      RAISE NOTICE 'Skipping realtime for missing table: %', t;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

SELECT 'Admin JWT helper + conditional RLS/realtime applied.' AS status;
