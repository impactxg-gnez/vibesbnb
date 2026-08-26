-- Check-in / check-out clock times + optional early check-in / late check-out (with optional fees).
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS check_in_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS check_out_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS early_check_in_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS earliest_early_check_in_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS early_check_in_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_check_out_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS latest_late_check_out_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS late_check_out_fee NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN properties.check_in_time IS 'Standard check-in clock time as HH:mm (nullable = not set).';
COMMENT ON COLUMN properties.check_out_time IS 'Standard check-out clock time as HH:mm (nullable = not set).';
COMMENT ON COLUMN properties.early_check_in_allowed IS 'When true, guests may request early check-in.';
COMMENT ON COLUMN properties.earliest_early_check_in_time IS 'Earliest allowed early check-in as HH:mm.';
COMMENT ON COLUMN properties.early_check_in_fee IS 'Optional one-time fee when guest requests early check-in.';
COMMENT ON COLUMN properties.late_check_out_allowed IS 'When true, guests may request late check-out.';
COMMENT ON COLUMN properties.latest_late_check_out_time IS 'Latest allowed late check-out as HH:mm.';
COMMENT ON COLUMN properties.late_check_out_fee IS 'Optional one-time fee when guest requests late check-out.';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS early_check_in_requested BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_early_check_in_time TEXT NULL,
  ADD COLUMN IF NOT EXISTS late_check_out_requested BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_late_check_out_time TEXT NULL;

COMMENT ON COLUMN bookings.early_check_in_requested IS 'Guest opted into early check-in for this booking.';
COMMENT ON COLUMN bookings.requested_early_check_in_time IS 'Requested early check-in clock time as HH:mm.';
COMMENT ON COLUMN bookings.late_check_out_requested IS 'Guest opted into late check-out for this booking.';
COMMENT ON COLUMN bookings.requested_late_check_out_time IS 'Requested late check-out clock time as HH:mm.';

SELECT 'property check-in/out times + booking early/late columns applied.' AS status;
