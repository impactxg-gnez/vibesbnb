-- Add source_url column to properties table
-- Run this in Supabase Dashboard > SQL Editor
-- This allows storing the original import URL for re-scraping coordinates

-- Step 1: Add source_url column
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Step 2: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_source_url ON properties(source_url) 
WHERE source_url IS NOT NULL;

-- Step 3: Verify the column was added
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'properties' 
  AND column_name = 'source_url';

