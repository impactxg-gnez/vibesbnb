-- iCal Sync Tables for Calendar Integration
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Create table to store iCal sync sources for properties
CREATE TABLE IF NOT EXISTS property_ical_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Airbnb", "VRBO", "Booking.com"
  ical_url TEXT NOT NULL, -- The external iCal URL to sync from
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT, -- Last sync error if any
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ical_sources_property ON property_ical_sources(property_id);
CREATE INDEX IF NOT EXISTS idx_ical_sources_host ON property_ical_sources(host_id);

-- 3. Enable RLS
ALTER TABLE property_ical_sources ENABLE ROW LEVEL SECURITY;

-- 4. Hosts can manage their own iCal sources
CREATE POLICY "Hosts manage own ical sources"
  ON property_ical_sources
  FOR ALL
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- 5. Add ical_export_token to properties for secure export URLs
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS ical_export_token TEXT;

-- 6. Generate tokens for existing properties
UPDATE properties 
SET ical_export_token = encode(gen_random_bytes(16), 'hex')
WHERE ical_export_token IS NULL;

-- 7. Create trigger to auto-generate token for new properties
CREATE OR REPLACE FUNCTION generate_ical_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ical_export_token IS NULL THEN
    NEW.ical_export_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS property_ical_token_trigger ON properties;
CREATE TRIGGER property_ical_token_trigger
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION generate_ical_token();

-- 8. Add source column to property_availability to track where blocked dates came from
ALTER TABLE property_availability 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'booking', 'ical_sync'));

ALTER TABLE property_availability 
  ADD COLUMN IF NOT EXISTS ical_source_id UUID REFERENCES property_ical_sources(id) ON DELETE SET NULL;

-- Verify
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'property_ical_sources'
ORDER BY ordinal_position;

