-- Fast search/browse: never read huge images[] (base64 stacks) on list queries.
-- Safe to re-run. properties.id is TEXT.

-- 1) Slim cover URL column (http only, maintained by trigger + backfill)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS cover_image text;

CREATE INDEX IF NOT EXISTS idx_properties_status_created_at
  ON public.properties (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_properties_cover_image_not_null
  ON public.properties (created_at DESC)
  WHERE cover_image IS NOT NULL;

-- Helpers: scan images[] only when maintaining cover_image (not on every browse).
CREATE OR REPLACE FUNCTION public.property_http_images(imgs text[], n integer DEFAULT 3)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(x ORDER BY ord)
      FROM (
        SELECT trim(u) AS x, ord
        FROM unnest(COALESCE(imgs, ARRAY[]::text[])) WITH ORDINALITY AS t(u, ord)
        WHERE u IS NOT NULL
          AND length(trim(u)) > 12
          AND lower(trim(u)) LIKE 'http%'
          AND lower(trim(u)) NOT LIKE 'data:%'
          AND lower(trim(u)) NOT LIKE 'https://via.placeholder%'
          AND lower(trim(u)) NOT LIKE '%photo-1542718610%'
        ORDER BY ord
        LIMIT GREATEST(1, LEAST(COALESCE(n, 3), 8))
      ) s
    ),
    ARRAY[]::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.property_first_http_image(imgs text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT (public.property_http_images(imgs, 1))[1];
$$;

GRANT EXECUTE ON FUNCTION public.property_http_images(text[], integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.property_first_http_image(text[])
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.properties_set_cover_image()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.cover_image := public.property_first_http_image(NEW.images);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_cover_image ON public.properties;
CREATE TRIGGER trg_properties_cover_image
  BEFORE INSERT OR UPDATE OF images ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.properties_set_cover_image();

-- Backfill one row at a time so huge images[] rows don't blow statement_timeout.
DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT id
    FROM public.properties
    WHERE cover_image IS NULL
       OR btrim(cover_image) = ''
       OR lower(cover_image) LIKE 'data:%'
    ORDER BY created_at DESC NULLS LAST
  LOOP
    UPDATE public.properties p
    SET cover_image = public.property_first_http_image(p.images)
    WHERE p.id = r.id;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'cover_image backfill updated % rows', n;
END $$;

-- Batch covers for any legacy callers (reads images[] — use sparingly).
DROP FUNCTION IF EXISTS public.property_cover_images(text[]);
CREATE OR REPLACE FUNCTION public.property_cover_images(p_ids text[])
RETURNS TABLE (id text, cover_image text, cover_images text[])
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id::text,
    NULLIF(btrim(p.cover_image), '') AS cover_image,
    CASE
      WHEN p.cover_image IS NULL OR btrim(p.cover_image) = '' THEN ARRAY[]::text[]
      WHEN lower(p.cover_image) LIKE 'http%' THEN ARRAY[btrim(p.cover_image)]
      ELSE ARRAY[]::text[]
    END AS cover_images
  FROM public.properties p
  WHERE p.id = ANY (p_ids);
$$;

GRANT EXECUTE ON FUNCTION public.property_cover_images(text[])
  TO anon, authenticated, service_role;

-- Browse cards: NEVER touch images[] — only cover_image + slim card fields.
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
  cover_image text
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
      WHEN p.cover_image IS NOT NULL
        AND length(btrim(p.cover_image)) > 12
        AND lower(btrim(p.cover_image)) LIKE 'http%'
      THEN ARRAY[btrim(p.cover_image)]
      ELSE ARRAY[]::text[]
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
    NULLIF(btrim(p.cover_image), '')
  FROM public.properties p
  WHERE p.status = 'active'
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.browse_active_property_cards(integer, integer)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.browse_active_property_cards(integer, integer) IS
  'Paged active cards using cover_image only (never images[]).';

-- Quick sanity counts for the SQL editor results panel
SELECT
  count(*) FILTER (WHERE status = 'active') AS active_count,
  count(*) FILTER (WHERE status IS DISTINCT FROM 'active') AS non_active_count,
  count(*) AS total_count,
  count(*) FILTER (
    WHERE status = 'active'
      AND cover_image IS NOT NULL
      AND lower(cover_image) LIKE 'http%'
  ) AS active_with_http_cover
FROM public.properties;
