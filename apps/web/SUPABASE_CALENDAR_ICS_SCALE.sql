-- Scalable ICS import storage + helpers (run in Supabase SQL Editor)
--
-- NOTE: Guest reservations already live in public.bookings. This adds
-- calendar_import_bookings for *imported external platform stays* (Airbnb, etc.).
-- property_ical_sources is the canonical "external_calendars" table (see VIEW below).
--
-- If you see "relation property_ical_sources does not exist", either:
--   (A) Section 0 below creates it (properties + auth.users must exist), or
--   (B) Run apps/web/SUPABASE_ICAL_SYNC.sql first for the full baseline (tokens,
--       property_availability.ical_source_id, etc.).

-- ---------------------------------------------------------------------------
-- 0) Bootstrap property_ical_sources when missing (safe no-op otherwise)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_ical_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ical_url TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ical_sources_property ON property_ical_sources(property_id);
CREATE INDEX IF NOT EXISTS idx_ical_sources_host ON property_ical_sources(host_id);

ALTER TABLE property_ical_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts manage own ical sources" ON property_ical_sources;
CREATE POLICY "Hosts manage own ical sources"
  ON property_ical_sources FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- ---------------------------------------------------------------------------
-- 1) Extend property_ical_sources (external calendar connections)
-- ---------------------------------------------------------------------------
ALTER TABLE property_ical_sources
  ADD COLUMN IF NOT EXISTS last_hash TEXT;

ALTER TABLE property_ical_sources
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'active'
  CHECK (sync_status IN ('active', 'failed'));

ALTER TABLE property_ical_sources
  ADD COLUMN IF NOT EXISTS last_manual_sync_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ical_sources_sync_status
  ON property_ical_sources (sync_status, last_synced_at);

CREATE INDEX IF NOT EXISTS idx_ical_sources_last_sync
  ON property_ical_sources (last_synced_at ASC NULLS FIRST)
  WHERE is_active = true;

COMMENT ON COLUMN property_ical_sources.last_hash IS 'SHA-256 hex of last fetched ICS body; skip parse when unchanged.';
COMMENT ON COLUMN property_ical_sources.sync_status IS 'active | failed — batch worker rotates; failed rows still sync on schedule.';

-- ---------------------------------------------------------------------------
-- 2) Imported calendar events (spec "bookings" for external-only)
-- end_date follows iCal DATE exclusivity (checkout morning = first free night)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_import_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  external_calendar_id UUID NOT NULL REFERENCES property_ical_sources(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'ical',
  external_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT calendar_import_dates_ok CHECK (end_date > start_date),
  CONSTRAINT calendar_import_external_unique UNIQUE (external_calendar_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_import_property_dates
  ON calendar_import_bookings (property_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_calendar_import_external_id
  ON calendar_import_bookings (external_id);

CREATE INDEX IF NOT EXISTS idx_calendar_import_calendar
  ON calendar_import_bookings (external_calendar_id, start_date);

COMMENT ON TABLE calendar_import_bookings IS 'Parsed external ICS events (UID-keyed). end_date is iCal-exclusive (last occupied night = end_date - 1).';
COMMENT ON COLUMN calendar_import_bookings.source IS 'airbnb | booking | ical | internal label for export traceability';

ALTER TABLE calendar_import_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts read import rows for own properties"
  ON calendar_import_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = calendar_import_bookings.property_id
        AND p.host_id = auth.uid()
    )
  );

-- Optional: admins / service role bypass RLS via service key

-- ---------------------------------------------------------------------------
-- VIEW alias for API docs (matches "external_calendars" naming)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW external_calendars AS
SELECT
  id,
  property_id,
  host_id,
  name,
  ical_url,
  last_synced_at,
  last_hash,
  sync_status,
  sync_error,
  is_active,
  last_manual_sync_at,
  created_at,
  updated_at
FROM property_ical_sources;

-- ---------------------------------------------------------------------------
-- 3) Delete imported events that disappeared from ICS (bounded window)
-- p_uids = NULL or empty => remove all imports in window for that calendar
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calendar_delete_import_orphans(
  p_calendar_id UUID,
  p_window_start DATE,
  p_window_end DATE,
  p_uids TEXT[]
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF p_uids IS NULL OR array_length(p_uids, 1) IS NULL THEN
    DELETE FROM calendar_import_bookings c
    WHERE c.external_calendar_id = p_calendar_id
      AND c.start_date >= p_window_start
      AND c.start_date < p_window_end;
  ELSE
    DELETE FROM calendar_import_bookings c
    WHERE c.external_calendar_id = p_calendar_id
      AND c.start_date >= p_window_start
      AND c.start_date < p_window_end
      AND NOT (c.external_id = ANY (p_uids));
  END IF;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION calendar_delete_import_orphans(UUID, DATE, DATE, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION calendar_delete_import_orphans(UUID, DATE, DATE, TEXT[]) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Rebuild property_availability for one iCal feed in [p_from, p_to) —
-- single round-trip instead of thousands of inserts from app servers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calendar_refresh_ical_availability(
  p_property TEXT,
  p_calendar UUID,
  p_host UUID,
  p_from DATE,
  p_to DATE
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM property_availability pa
  WHERE pa.property_id = p_property
    AND pa.ical_source_id = p_calendar
    AND pa.source = 'ical_sync'
    AND pa.room_id IS NULL
    AND pa.day >= p_from
    AND pa.day < p_to;

  INSERT INTO property_availability (property_id, host_id, day, status, source, ical_source_id, note)
  SELECT
    p_property,
    p_host,
    g.d::date,
    'blocked',
    'ical_sync',
    p_calendar,
    'External calendar'
  FROM calendar_import_bookings c
  CROSS JOIN LATERAL generate_series(
    GREATEST(c.start_date, p_from),
    LEAST(c.end_date - 1, p_to - 1),
    interval '1 day'
  ) AS g(d)
  WHERE c.external_calendar_id = p_calendar
    AND c.start_date < p_to
    AND c.end_date > p_from
    AND GREATEST(c.start_date, p_from) <= LEAST(c.end_date - 1, p_to - 1)
    AND NOT EXISTS (
      SELECT 1 FROM property_availability x
      WHERE x.property_id = p_property
        AND x.day = g.d::date
        AND x.room_id IS NULL
        AND x.status = 'booked'
    )
    AND NOT EXISTS (
      SELECT 1 FROM property_availability x2
      WHERE x2.property_id = p_property
        AND x2.day = g.d::date
        AND x2.room_id IS NULL
        AND x2.booking_id IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION calendar_refresh_ical_availability(TEXT, UUID, UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION calendar_refresh_ical_availability(TEXT, UUID, UUID, DATE, DATE) TO service_role;
