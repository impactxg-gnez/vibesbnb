-- Fix Properties Table - Add Missing Columns
-- Run this in Supabase Dashboard > SQL Editor
-- This adds the 'rooms' column and ensures all required columns exist

-- Step 1: Add rooms column as JSONB to store array of room objects
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::jsonb;

-- Step 2: Add other missing columns that might be needed
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS smoke_friendly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS beds INTEGER,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Add index for rooms column (optional, for faster queries if needed)
CREATE INDEX IF NOT EXISTS idx_properties_rooms ON properties USING GIN (rooms);

-- Step 4: Add index for coordinates (for location-based queries)
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON properties(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Step 5: Verify all columns exist
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'properties' 
  AND column_name IN ('rooms', 'latitude', 'longitude', 'smoke_friendly', 'beds', 'created_at', 'updated_at')
ORDER BY column_name;

-- Step 6: Check if there are any properties with missing required fields
SELECT 
  COUNT(*) as total_properties,
  COUNT(CASE WHEN host_id IS NULL THEN 1 END) as missing_host_id,
  COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as missing_name,
  COUNT(CASE WHEN location IS NULL OR location = '' THEN 1 END) as missing_location
FROM properties;

