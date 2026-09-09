-- VibesBNB: Accessibility (WCAG / DOJ lodging features)
-- Run in Supabase SQL Editor (production).
-- Note: properties.id is TEXT (not uuid) — FKs and RPC args must match.

-- Host narrative + Adapted program status
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS accessibility_description text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS adapted_status text NOT NULL DEFAULT 'none';

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_adapted_status_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_adapted_status_check
  CHECK (adapted_status IN ('none', 'pending', 'verified', 'rejected'));

-- Per-image alt text: [{ "url": "...", "alt": "...", "source": "host"|"ai"|"fallback" }]
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS image_alts jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.properties.accessibility_description IS
  'Host-authored text describing accessible features for travelers.';
COMMENT ON COLUMN public.properties.adapted_status IS
  'Adapted program: none | pending | verified | rejected';
COMMENT ON COLUMN public.properties.image_alts IS
  'JSON array of {url, alt, source} aligned with property images.';

-- Proof photos for Adapted verification (property_id TEXT to match properties.id)
DROP TABLE IF EXISTS public.property_accessibility_proofs CASCADE;

CREATE TABLE public.property_accessibility_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  image_url text NOT NULL,
  caption text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

CREATE INDEX idx_a11y_proofs_property
  ON public.property_accessibility_proofs (property_id);

CREATE INDEX idx_a11y_proofs_status
  ON public.property_accessibility_proofs (status)
  WHERE status = 'pending';

ALTER TABLE public.property_accessibility_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS a11y_proofs_select ON public.property_accessibility_proofs;
CREATE POLICY a11y_proofs_select ON public.property_accessibility_proofs
  FOR SELECT USING (
    status = 'approved'
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS a11y_proofs_insert ON public.property_accessibility_proofs;
CREATE POLICY a11y_proofs_insert ON public.property_accessibility_proofs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.host_id = auth.uid()
    )
  );

-- Drop prior signature if a failed/partial run created the uuid version
DROP FUNCTION IF EXISTS public.hold_booking_nights_atomic(uuid, uuid, uuid, date, date, text[]);
DROP FUNCTION IF EXISTS public.hold_booking_nights_atomic(text, uuid, uuid, date, date, text[]);

-- Atomic inventory hold for a booking stay (reduces double-book races on accessible units)
CREATE OR REPLACE FUNCTION public.hold_booking_nights_atomic(
  p_property_id text,
  p_host_id uuid,
  p_booking_id uuid,
  p_check_in date,
  p_check_out date,
  p_room_ids text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d date;
  rid text;
  rooms text[];
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'invalid_stay_range';
  END IF;

  IF p_room_ids IS NULL OR array_length(p_room_ids, 1) IS NULL THEN
    rooms := ARRAY[NULL]::text[];
  ELSE
    rooms := p_room_ids;
  END IF;

  -- Lock existing availability rows for this property/stay
  PERFORM 1
  FROM public.property_availability pa
  WHERE pa.property_id = p_property_id
    AND pa.day >= p_check_in
    AND pa.day < p_check_out
  FOR UPDATE;

  -- Conflict if any night is booked/blocked by another booking
  IF EXISTS (
    SELECT 1
    FROM public.property_availability pa
    WHERE pa.property_id = p_property_id
      AND pa.day >= p_check_in
      AND pa.day < p_check_out
      AND pa.status IN ('booked', 'blocked')
      AND (pa.booking_id IS DISTINCT FROM p_booking_id)
      AND (
        (p_room_ids IS NULL OR array_length(p_room_ids, 1) IS NULL)
        OR pa.room_id IS NULL
        OR pa.room_id = ANY (p_room_ids)
      )
  ) THEN
    RAISE EXCEPTION 'stay_conflict';
  END IF;

  FOREACH rid IN ARRAY rooms LOOP
    d := p_check_in;
    WHILE d < p_check_out LOOP
      IF rid IS NULL THEN
        INSERT INTO public.property_availability AS pa
          (property_id, host_id, day, status, room_id, booking_id, note)
        VALUES
          (p_property_id, p_host_id, d, 'blocked', NULL, p_booking_id, 'pending_booking_request')
        ON CONFLICT (property_id, day) WHERE room_id IS NULL
        DO UPDATE SET
          status = 'blocked',
          booking_id = EXCLUDED.booking_id,
          host_id = EXCLUDED.host_id,
          note = EXCLUDED.note;
      ELSE
        INSERT INTO public.property_availability AS pa
          (property_id, host_id, day, status, room_id, booking_id, note)
        VALUES
          (p_property_id, p_host_id, d, 'blocked', rid, p_booking_id, 'pending_booking_request')
        ON CONFLICT (property_id, room_id, day) WHERE room_id IS NOT NULL
        DO UPDATE SET
          status = 'blocked',
          booking_id = EXCLUDED.booking_id,
          host_id = EXCLUDED.host_id,
          note = EXCLUDED.note;
      END IF;
      d := d + 1;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hold_booking_nights_atomic(text, uuid, uuid, date, date, text[]) TO service_role;
