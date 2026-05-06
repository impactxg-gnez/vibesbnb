-- Optional minimum stay: NULL = no rule; integer 1–365 = guests must book at least that many nights.
-- Run in Supabase SQL Editor after other properties migrations.

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS min_booking_nights INTEGER NULL;

COMMENT ON COLUMN properties.min_booking_nights IS 'When set, booking checkout minus check-in must be >= this many nights.';
