-- Cancellation policy + health & safety + booking refund snapshots.
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT NOT NULL DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS parties_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS safety_smoke_co_detectors BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS safety_first_aid_kit BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS safety_emergency_exits BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS safety_building_security BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN properties.cancellation_policy IS 'Host policy: flexible | moderate | firm | strict (Airbnb-style).';
COMMENT ON COLUMN properties.parties_allowed IS 'Whether parties or events are allowed.';
COMMENT ON COLUMN properties.safety_smoke_co_detectors IS 'Smoke and CO detectors present.';
COMMENT ON COLUMN properties.safety_first_aid_kit IS 'First aid kit available.';
COMMENT ON COLUMN properties.safety_emergency_exits IS 'Emergency exits marked / accessible.';
COMMENT ON COLUMN properties.safety_building_security IS 'Building security features present.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_cancellation_policy_check'
  ) THEN
    ALTER TABLE properties
      ADD CONSTRAINT properties_cancellation_policy_check
      CHECK (cancellation_policy IN ('flexible', 'moderate', 'firm', 'strict'));
  END IF;
END $$;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT NULL,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS refund_percent NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS refund_summary TEXT NULL;

COMMENT ON COLUMN bookings.cancellation_policy IS 'Snapshot of property cancellation policy at booking create.';
COMMENT ON COLUMN bookings.refund_amount IS 'Calculated refund amount on cancel (USD).';
COMMENT ON COLUMN bookings.refund_percent IS 'Refund as percent of total paid.';
COMMENT ON COLUMN bookings.refund_summary IS 'Human-readable rule applied for the refund.';

SELECT 'cancellation policy + safety + booking refund columns applied.' AS status;
