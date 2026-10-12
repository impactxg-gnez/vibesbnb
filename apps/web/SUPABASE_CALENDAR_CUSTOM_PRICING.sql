-- =============================================================================
-- Migration: Add custom daily pricing support to property_availability
-- =============================================================================
-- Allows hosts to set custom nightly rates for specific dates on their calendar.
-- Run this in Supabase Dashboard > SQL Editor.

ALTER TABLE property_availability 
  ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

COMMENT ON COLUMN property_availability.price IS 
  'Custom nightly price override for this date. NULL means property base price applies.';

-- Ensure index exists for date and property lookups
CREATE INDEX IF NOT EXISTS idx_property_availability_property_day 
  ON property_availability(property_id, day);

SELECT 'Custom daily pricing column added to property_availability successfully.' AS status;
