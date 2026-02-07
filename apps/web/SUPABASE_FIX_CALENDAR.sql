-- Fix Calendar/Availability System for Booking Sync
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Add room_id column to property_availability if it doesn't exist
ALTER TABLE property_availability 
  ADD COLUMN IF NOT EXISTS room_id TEXT;

-- 2. Drop the old unique constraint that doesn't include room_id
DROP INDEX IF EXISTS property_availability_property_day_idx;

-- 3. Create new unique constraint that includes room_id (NULL for property-wide blocks)
-- We need separate handling for NULL room_id values
-- First, add a partial unique index for rows with room_id
CREATE UNIQUE INDEX IF NOT EXISTS property_availability_property_room_day_idx
  ON property_availability(property_id, room_id, day)
  WHERE room_id IS NOT NULL;

-- Second, add a partial unique index for rows without room_id (property-wide blocks)
CREATE UNIQUE INDEX IF NOT EXISTS property_availability_property_wide_day_idx
  ON property_availability(property_id, day)
  WHERE room_id IS NULL;

-- 4. Create index for faster queries by room
CREATE INDEX IF NOT EXISTS property_availability_room_idx
  ON property_availability(property_id, room_id, day);

-- 5. Drop existing RLS policies and recreate with proper permissions
DROP POLICY IF EXISTS "Hosts manage availability" ON property_availability;
DROP POLICY IF EXISTS "Travellers read availability" ON property_availability;
DROP POLICY IF EXISTS "Service can insert booked dates" ON property_availability;

-- 6. Enable RLS
ALTER TABLE property_availability ENABLE ROW LEVEL SECURITY;

-- 7. Hosts can manage their own availability (block/unblock dates manually)
CREATE POLICY "Hosts manage availability"
  ON property_availability
  FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- 8. Anyone can read availability for properties (travelers need to see blocked dates)
CREATE POLICY "Anyone can read availability"
  ON property_availability
  FOR SELECT
  USING (true);

-- 9. Allow authenticated users to insert bookings (the booking API will handle validation)
-- This is needed because when a traveler books, we need to mark those dates as booked
CREATE POLICY "Authenticated users can mark booked dates"
  ON property_availability
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND status = 'booked'
  );

-- 10. Allow service role to do anything (for booking API using service client)
-- Note: Service role bypasses RLS by default, but this is explicit for clarity

-- 11. Add booking_id column to track which booking blocked the date
ALTER TABLE property_availability 
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- 12. Create index for booking_id lookups
CREATE INDEX IF NOT EXISTS property_availability_booking_idx
  ON property_availability(booking_id) WHERE booking_id IS NOT NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'property_availability'
ORDER BY ordinal_position;

