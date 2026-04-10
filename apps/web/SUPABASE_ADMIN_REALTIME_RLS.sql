-- Admin Realtime (postgres_changes): run in Supabase SQL Editor
--
-- Supabase only delivers postgres_changes for rows the JWT may SELECT under RLS.
-- Sign in with a real Supabase session (not client demo shortcuts) so the browser
-- has a valid access token.
--
-- Keep the email list inside is_vibesbnb_admin_jwt() in sync with
-- apps/web/src/lib/auth/isAdmin.ts (ADMIN_EMAILS).
--
-- Also ensure these tables are in the Realtime publication (this block adds them if missing):
--   bookings, properties, pending_host_applications, pending_profile_pictures, dispensaries

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
-- RLS: admins can read all rows (matches app isAdminUser)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (public.is_vibesbnb_admin_jwt());

DROP POLICY IF EXISTS "Admins can view all properties" ON properties;
CREATE POLICY "Admins can view all properties"
  ON properties FOR SELECT
  USING (public.is_vibesbnb_admin_jwt());

DROP POLICY IF EXISTS "Admins can view all pending host applications (jwt)" ON pending_host_applications;
CREATE POLICY "Admins can view all pending host applications (jwt)"
  ON pending_host_applications FOR SELECT
  USING (public.is_vibesbnb_admin_jwt());

DROP POLICY IF EXISTS "Admins can update pending host applications (jwt)" ON pending_host_applications;
CREATE POLICY "Admins can update pending host applications (jwt)"
  ON pending_host_applications FOR UPDATE
  USING (public.is_vibesbnb_admin_jwt());

-- Align with AdminLayout realtime + admin actions (role-only policies miss allowlisted emails)
DROP POLICY IF EXISTS "Admins can view all profile pictures" ON pending_profile_pictures;
CREATE POLICY "Admins can view all profile pictures"
  ON pending_profile_pictures FOR SELECT
  USING (public.is_vibesbnb_admin_jwt());

DROP POLICY IF EXISTS "Admins can update profile pictures" ON pending_profile_pictures;
CREATE POLICY "Admins can update profile pictures"
  ON pending_profile_pictures FOR UPDATE
  USING (public.is_vibesbnb_admin_jwt());

DROP POLICY IF EXISTS "Admins can read all dispensaries" ON dispensaries;
DROP POLICY IF EXISTS "Admins can update dispensaries" ON dispensaries;
DROP POLICY IF EXISTS "Admins can delete dispensaries" ON dispensaries;
CREATE POLICY "Admins can read all dispensaries"
  ON dispensaries FOR SELECT
  USING (public.is_vibesbnb_admin_jwt());
CREATE POLICY "Admins can update dispensaries"
  ON dispensaries FOR UPDATE
  USING (public.is_vibesbnb_admin_jwt());
CREATE POLICY "Admins can delete dispensaries"
  ON dispensaries FOR DELETE
  USING (public.is_vibesbnb_admin_jwt());

-- ---------------------------------------------------------------------------
-- Realtime publication (idempotent)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'bookings',
    'properties',
    'pending_host_applications',
    'pending_profile_pictures',
    'dispensaries'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
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
