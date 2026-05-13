-- VibesBNB: Disk I/O + query path optimizations (run in Supabase SQL Editor).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where applicable.
--
-- Contents:
--   1) High-signal btree / partial indexes (bookings overlap, availability scans, messages)
--   2) calendar_refresh_ical_availability: incremental delete/insert (no full-window wipe)
--   3) Optional RLS-friendly expression indexes (auth.uid() patterns — add manually if you
--      rewrite policies to use (select auth.uid()) per Supabase guidance)

-- ---------------------------------------------------------------------------
-- 1) Bookings: overlap + host/user filters (common in dashboards + conflict checks)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_property_check_in
  ON bookings (property_id, check_in);

CREATE INDEX IF NOT EXISTS idx_bookings_property_check_out
  ON bookings (property_id, check_out);

CREATE INDEX IF NOT EXISTS idx_bookings_user_check_in
  ON bookings (user_id, check_in DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_host_check_in
  ON bookings (host_id, check_in DESC);

-- Hot path: "active-ish" stays on a listing overlapping a window (tune statuses to your app)
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates_open
  ON bookings (property_id, check_in, check_out)
  WHERE status NOT IN ('cancelled', 'rejected');

-- ---------------------------------------------------------------------------
-- 2) property_availability: range + blocked lookup (search / PDP / conflict checks)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_property_availability_prop_day_status
  ON property_availability (property_id, day, status)
  WHERE status IN ('blocked', 'booked');

CREATE INDEX IF NOT EXISTS idx_property_availability_prop_room_day
  ON property_availability (property_id, room_id, day)
  WHERE room_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) property_ical_sources: batch worker + property-scoped admin UI
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ical_sources_property_active_sync
  ON property_ical_sources (property_id, is_active, last_synced_at ASC NULLS FIRST);

-- ---------------------------------------------------------------------------
-- 4) messages: conversation timeline (already have messages_conversation_idx in baseline;
--    keep compatible name for installs that only ran this migration)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages (conversation_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- 5) calendar_import_bookings: overlap against a window (optional; complements existing)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_calendar_import_cal_end
  ON calendar_import_bookings (external_calendar_id, end_date);

-- ---------------------------------------------------------------------------
-- 6) Incremental iCal → property_availability refresh
--     Deletes only obsolete nights; inserts only missing nights.
--     Preserves rows for dates still blocked by the same feed (no rewrite).
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
  WITH desired AS (
    SELECT DISTINCT g.d::date AS day
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
  )
  DELETE FROM property_availability pa
  WHERE pa.property_id = p_property
    AND pa.ical_source_id = p_calendar
    AND pa.source = 'ical_sync'
    AND pa.room_id IS NULL
    AND pa.day >= p_from
    AND pa.day < p_to
    AND NOT EXISTS (SELECT 1 FROM desired d WHERE d.day = pa.day);

  INSERT INTO property_availability (property_id, host_id, day, status, source, ical_source_id, note)
  SELECT
    p_property,
    p_host,
    d.day,
    'blocked',
    'ical_sync',
    p_calendar,
    'External calendar'
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM property_availability x
    WHERE x.property_id = p_property
      AND x.day = d.day
      AND x.room_id IS NULL
      AND (
        x.status = 'booked'
        OR x.booking_id IS NOT NULL
        OR (x.source = 'ical_sync' AND x.ical_source_id IS NOT DISTINCT FROM p_calendar)
        OR (
          x.status = 'blocked'
          AND (
            x.source <> 'ical_sync'
            OR x.ical_source_id IS DISTINCT FROM p_calendar
          )
        )
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION calendar_refresh_ical_availability(TEXT, UUID, UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION calendar_refresh_ical_availability(TEXT, UUID, UUID, DATE, DATE) TO service_role;

COMMENT ON FUNCTION calendar_refresh_ical_availability(TEXT, UUID, UUID, DATE, DATE) IS
  'Incremental iCal availability: remove obsolete blocked nights for one feed, insert only missing nights in [p_from,p_to).';
