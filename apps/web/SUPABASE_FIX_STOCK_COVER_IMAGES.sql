-- Replace leftover stock placeholder cover_image with the first real photo in images[].
-- Safe to re-run. properties.images is text[].
-- Run in Supabase Dashboard > SQL Editor.

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
          AND lower(trim(u)) NOT LIKE '%placeholder%'
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
       OR lower(cover_image) LIKE '%placeholder%'
       OR lower(cover_image) LIKE '%photo-1542718610%'
    ORDER BY created_at DESC NULLS LAST
  LOOP
    UPDATE public.properties p
    SET cover_image = public.property_first_http_image(p.images)
    WHERE p.id = r.id;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'stock cover_image backfill updated % rows', n;
END $$;

SELECT 'cover_image stock placeholders replaced with first real gallery photo.' AS status;
