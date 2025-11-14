-- Complete Properties Table Migration
-- Run this in Supabase Dashboard > SQL Editor
-- This script adds all missing columns and updates RLS policies

-- Step 1: Add host_id column (required for linking properties to hosts)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add index for host_id (for faster queries)
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON properties(host_id);

-- Step 3: Add all property detail columns
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms INTEGER,
ADD COLUMN IF NOT EXISTS beds INTEGER,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS wellness_friendly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Step 4: Update RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view active properties" ON properties;
DROP POLICY IF EXISTS "Hosts can view their own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can insert their own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can update their own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can delete their own properties" ON properties;

-- Policy: Everyone can view active properties (for search/listing pages)
CREATE POLICY "Everyone can view active properties"
  ON properties FOR SELECT
  USING (status = 'active');

-- Policy: Hosts can view all their properties (active, draft, inactive)
CREATE POLICY "Hosts can view their own properties"
  ON properties FOR SELECT
  USING (host_id = auth.uid());

-- Policy: Hosts can insert their own properties
CREATE POLICY "Hosts can insert their own properties"
  ON properties FOR INSERT
  WITH CHECK (host_id = auth.uid());

-- Policy: Hosts can update their own properties
CREATE POLICY "Hosts can update their own properties"
  ON properties FOR UPDATE
  USING (host_id = auth.uid());

-- Policy: Hosts can delete their own properties
CREATE POLICY "Hosts can delete their own properties"
  ON properties FOR DELETE
  USING (host_id = auth.uid());

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'properties'
ORDER BY ordinal_position;

