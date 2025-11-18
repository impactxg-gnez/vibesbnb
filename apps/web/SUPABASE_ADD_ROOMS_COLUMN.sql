-- Add rooms column to properties table
-- Run this in Supabase Dashboard > SQL Editor

-- Add rooms column as JSONB to store array of room objects
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::jsonb;

-- Add index for rooms column (optional, for faster queries if needed)
CREATE INDEX IF NOT EXISTS idx_properties_rooms ON properties USING GIN (rooms);

-- Verify the column was added
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'properties' 
  AND column_name = 'rooms';

