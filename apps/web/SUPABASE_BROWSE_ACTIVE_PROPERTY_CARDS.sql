-- Fast browse cards: truncate huge images[] arrays (imports often ship 50–200+ URLs).
-- Used by /api/properties/browse to avoid statement timeouts.

CREATE OR REPLACE FUNCTION public.browse_active_property_cards(
  p_limit integer DEFAULT 40,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
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
    p.id,
    p.host_id,
    p.name,
    p.title,
    p.location,
    p.price,
    p.rating,
    p.reviews_count,
    p.has_team_review,
    COALESCE(p.images[1:4], ARRAY[]::text[]) AS images,
    p.type,
    p.amenities,
    p.guests,
    p.status,
    p.created_at,
    p.bedrooms,
    p.bathrooms,
    p.beds,
    p.wellness_friendly,
    p.wellness_consumption_indoor_allowed,
    p.wellness_consumption_outdoor_allowed,
    p.latitude,
    p.longitude,
    p.smoking_inside_allowed,
    p.smoking_outside_allowed,
    p.smoke_friendly,
    p.min_booking_nights,
    p.vibesbnb_take
  FROM public.properties p
  WHERE p.status = 'active'
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.browse_active_property_cards(integer, integer) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.browse_active_property_cards(integer, integer) IS
  'Paged active listing cards with images truncated to 4 URLs for search/browse performance.';
