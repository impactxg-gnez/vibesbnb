-- Support for multi-unit properties (per-unit availability and booking)
-- Run this in your Supabase SQL Editor

-- 1. Update property_availability to support room_id (unit_id)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'property_availability' AND column_name = 'room_id') THEN
    ALTER TABLE property_availability ADD COLUMN room_id TEXT;
    -- Note: room_id is text because it refers to the ID in the rooms JSONB array
  END IF;
END $$;

-- 2. Update bookings to track selected units
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'selected_units') THEN
    ALTER TABLE bookings ADD COLUMN selected_units JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3. Create index for faster availability checks per unit
CREATE INDEX IF NOT EXISTS idx_property_availability_unit ON property_availability(property_id, room_id, day);

-- 4. Informative comment
COMMENT ON COLUMN property_availability.room_id IS 'Specific unit/room ID from the property rooms JSONB array';
COMMENT ON COLUMN bookings.selected_units IS 'List of unit IDs and details booked in this transaction';
