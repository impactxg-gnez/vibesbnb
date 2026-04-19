-- Admin support: update/insert properties on behalf of hosts (used with in-app impersonation scope).
-- Run in Supabase SQL Editor after SUPABASE_ADMIN_REALTIME_RLS.sql (requires is_vibesbnb_admin_jwt()).

DROP POLICY IF EXISTS "Admins can update all properties" ON properties;
CREATE POLICY "Admins can update all properties"
  ON properties FOR UPDATE
  USING (public.is_vibesbnb_admin_jwt())
  WITH CHECK (public.is_vibesbnb_admin_jwt());

DROP POLICY IF EXISTS "Admins can insert properties for any host" ON properties;
CREATE POLICY "Admins can insert properties for any host"
  ON properties FOR INSERT
  WITH CHECK (public.is_vibesbnb_admin_jwt());

DROP POLICY IF EXISTS "Admins can delete any property" ON properties;
CREATE POLICY "Admins can delete any property"
  ON properties FOR DELETE
  USING (public.is_vibesbnb_admin_jwt());
