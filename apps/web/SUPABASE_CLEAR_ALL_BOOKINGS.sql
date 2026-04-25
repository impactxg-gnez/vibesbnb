-- Clear all bookings and reset related data (for a fresh start / test cleanup)
-- Run in Supabase Dashboard → SQL Editor (use a role that can delete from public tables).
--
-- What this does:
--   1) DELETE FROM bookings — removes all booking rows. Notifications with
--      related_booking_id → ON DELETE CASCADE from bookings are removed.
--   2) conversations.booking_id and property_availability.booking_id are
--      ON DELETE SET NULL; “booked” rows would otherwise look inconsistent.
--   3) UPDATE property_availability — any row still marked 'booked' is set
--      back to 'available' so the calendar is clean.

BEGIN;

DELETE FROM bookings;

UPDATE property_availability
SET
  status = 'available',
  note = NULL,
  booking_id = NULL
WHERE status = 'booked';

COMMIT;

-- Optional: verify
-- SELECT COUNT(*) AS bookings_remaining FROM bookings;
-- SELECT * FROM property_availability WHERE status = 'booked';
