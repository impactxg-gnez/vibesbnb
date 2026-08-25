-- Admin Property Management: fast list without reading heavy columns (images, embedding, etc.)
-- Run in Supabase SQL Editor AFTER SUPABASE_ADMIN_PERFORMANCE.sql
-- Safe to re-run.

-- Covering index: index-only scans for admin list (avoids heap fetches of wide rows)
CREATE INDEX IF NOT EXISTS idx_properties_admin_list_covering
  ON properties (created_at DESC NULLS LAST)
  INCLUDE (id, name, title, location, price, rating, status, host_id, wellness_friendly);

-- SECURITY DEFINER bypasses RLS; only callable via service_role from /api/admin/*
-- Returns cover_image = first URL only (never the full images[] array over the wire).
-- DROP required when changing RETURNS TABLE shape.
DROP FUNCTION IF EXISTS public.admin_list_properties(text, int, int);

CREATE OR REPLACE FUNCTION public.admin_list_properties(
  p_status text DEFAULT 'all',
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id text,
  name text,
  title text,
  location text,
  price numeric,
  rating numeric,
  status text,
  created_at timestamptz,
  host_id uuid,
  wellness_friendly boolean,
  cover_image text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.title,
    p.location,
    p.price,
    p.rating,
    p.status,
    p.created_at,
    p.host_id,
    p.wellness_friendly,
    NULLIF(BTRIM(p.images[1]), '') AS cover_image
  FROM properties p
  WHERE p_status IS NULL OR p_status = 'all' OR p.status = p_status
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 200))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.admin_list_properties(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_properties(text, int, int) TO service_role;

SELECT 'admin_list_properties RPC + covering index applied.' AS status;
