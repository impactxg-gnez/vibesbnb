-- Quick fix for dispensary registration 400 error
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Ensure dispensaries table has all required columns
ALTER TABLE dispensaries 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS delivery_radius INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Update status constraint to allow 'pending'
-- First drop the old constraint if exists
ALTER TABLE dispensaries DROP CONSTRAINT IF EXISTS dispensaries_status_check;

-- Add new constraint
ALTER TABLE dispensaries 
  ADD CONSTRAINT dispensaries_status_check 
  CHECK (status IN ('pending', 'active', 'inactive', 'paused'));

-- 3. Enable RLS
ALTER TABLE dispensaries ENABLE ROW LEVEL SECURITY;

-- 4. Drop and recreate insert policies to allow anonymous inserts
DROP POLICY IF EXISTS "Anyone can insert dispensary applications" ON dispensaries;
DROP POLICY IF EXISTS "Anonymous can insert dispensary applications" ON dispensaries;
DROP POLICY IF EXISTS "Public insert dispensary" ON dispensaries;

-- This policy allows anyone (including anonymous users) to insert
CREATE POLICY "Public insert dispensary" ON dispensaries
  FOR INSERT WITH CHECK (true);

-- 5. Allow admins to do everything
DROP POLICY IF EXISTS "Admins can read all dispensaries" ON dispensaries;
CREATE POLICY "Admins can read all dispensaries" ON dispensaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update dispensaries" ON dispensaries;
CREATE POLICY "Admins can update dispensaries" ON dispensaries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete dispensaries" ON dispensaries;
CREATE POLICY "Admins can delete dispensaries" ON dispensaries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 6. Allow public to read active dispensaries
DROP POLICY IF EXISTS "Public read active dispensaries" ON dispensaries;
CREATE POLICY "Public read active dispensaries" ON dispensaries
  FOR SELECT USING (status = 'active');

-- 7. Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'dispensaries'
ORDER BY ordinal_position;

