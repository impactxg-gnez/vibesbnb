-- One-time setup for fast search/browse. Safe to re-run.
-- properties.id is TEXT in this project (not uuid).

CREATE INDEX IF NOT EXISTS idx_properties_status_created_at
  ON public.properties (status, created_at DESC);

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
    COALESCE(p.images[1:4], ARRAY[]::text[]),
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
  WHERE p.status = 'active'
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.browse_active_property_cards(integer, integer)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.browse_active_property_cards(integer, integer) IS
  'Paged active listing cards with images truncated to 4 URLs for search/browse performance.';

SELECT 'browse_active_property_cards ready.' AS status;
