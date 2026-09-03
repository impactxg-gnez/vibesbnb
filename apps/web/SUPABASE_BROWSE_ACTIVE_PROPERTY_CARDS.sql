-- One-time setup for fast search/browse. Safe to re-run.
-- properties.id is TEXT. Prefer a single http(s) cover URL — never ship full images[]
-- (imports often store 50–200 URLs or huge data: URLs and time out PostgREST).

CREATE INDEX IF NOT EXISTS idx_properties_status_created_at
  ON public.properties (status, created_at DESC);

-- First remote http(s) image URL (skips blanks, data URLs, placeholders).
CREATE OR REPLACE FUNCTION public.property_first_http_image(imgs text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(u)
  FROM unnest(COALESCE(imgs, ARRAY[]::text[])) AS u
  WHERE u IS NOT NULL
    AND length(trim(u)) > 12
    AND lower(trim(u)) LIKE 'http%'
    AND lower(trim(u)) NOT LIKE 'data:%'
    AND lower(trim(u)) NOT LIKE 'https://via.placeholder%'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.property_first_http_image(text[])
  TO anon, authenticated, service_role;

-- Batch covers for browse fallback (no full images[] over the wire).
DROP FUNCTION IF EXISTS public.property_cover_images(text[]);
CREATE OR REPLACE FUNCTION public.property_cover_images(p_ids text[])
RETURNS TABLE (id text, cover_image text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id::text,
    public.property_first_http_image(p.images) AS cover_image
  FROM public.properties p
  WHERE p.id = ANY (p_ids);
$$;

GRANT EXECUTE ON FUNCTION public.property_cover_images(text[])
  TO anon, authenticated, service_role;

-- DROP required when changing RETURNS TABLE shape
DROP FUNCTION IF EXISTS public.browse_active_property_cards(integer, integer);

CREATE OR REPLACE FUNCTION public.browse_active_property_cards(
  p_limit integer DEFAULT 40,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id text,
  host_id uuid,
  name text,
  title text,
  location text,
  price numeric,
  rating numeric,
  reviews_count integer,
  has_team_review boolean,
  images text[],
  type text,
  amenities text[],
  guests integer,
  status text,
  created_at timestamptz,
  bedrooms integer,
  bathrooms numeric,
  beds integer,
  wellness_friendly boolean,
  wellness_consumption_indoor_allowed boolean,
  wellness_consumption_outdoor_allowed boolean,
  latitude double precision,
  longitude double precision,
  smoking_inside_allowed boolean,
  smoking_outside_allowed boolean,
  smoke_friendly boolean,
  min_booking_nights integer,
  vibesbnb_take text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id::text,
    p.host_id,
    p.name,
    p.title,
    p.location,
    p.price::numeric,
    p.rating::numeric,
    COALESCE(p.reviews_count, 0)::integer,
    COALESCE(p.has_team_review, false),
    CASE
      WHEN c.cover IS NULL THEN ARRAY[]::text[]
      ELSE ARRAY[c.cover]
    END,
    p.type,
    COALESCE(p.amenities, ARRAY[]::text[]),
    COALESCE(p.guests, 0)::integer,
    p.status,
    p.created_at,
    COALESCE(p.bedrooms, 0)::integer,
    COALESCE(p.bathrooms, 0)::numeric,
    COALESCE(p.beds, 0)::integer,
    COALESCE(p.wellness_friendly, false),
    COALESCE(p.wellness_consumption_indoor_allowed, false),
    COALESCE(p.wellness_consumption_outdoor_allowed, false),
    p.latitude::double precision,
    p.longitude::double precision,
    COALESCE(p.smoking_inside_allowed, false),
    COALESCE(p.smoking_outside_allowed, false),
    COALESCE(p.smoke_friendly, false),
    p.min_booking_nights::integer,
    p.vibesbnb_take
  FROM public.properties p
  LEFT JOIN LATERAL (
    SELECT public.property_first_http_image(p.images) AS cover
  ) c ON true
  WHERE p.status = 'active'
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.browse_active_property_cards(integer, integer)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.browse_active_property_cards(integer, integer) IS
  'Paged active listing cards with a single http(s) cover URL in images[0].';

SELECT 'browse_active_property_cards ready (cover-only images).' AS status;
