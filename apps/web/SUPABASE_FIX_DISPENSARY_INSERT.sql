-- Quick fix for dispensary registration 400 error
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Create dispensaries table if it doesn't exist
CREATE TABLE IF NOT EXISTS dispensaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  owner_name TEXT,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  delivery_radius INTEGER DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- 2. Add missing columns if table already exists
ALTER TABLE dispensaries 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS delivery_radius INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 3. Update status constraint to allow all needed values
ALTER TABLE dispensaries DROP CONSTRAINT IF EXISTS dispensaries_status_check;
ALTER TABLE dispensaries 
  ADD CONSTRAINT dispensaries_status_check 
  CHECK (status IN ('pending', 'active', 'inactive', 'paused'));

-- 4. Enable RLS
ALTER TABLE dispensaries ENABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can insert dispensary applications" ON dispensaries;
DROP POLICY IF EXISTS "Anonymous can insert dispensary applications" ON dispensaries;
DROP POLICY IF EXISTS "Public insert dispensary" ON dispensaries;
DROP POLICY IF EXISTS "Admins can read all dispensaries" ON dispensaries;
DROP POLICY IF EXISTS "Admins can update dispensaries" ON dispensaries;
DROP POLICY IF EXISTS "Admins can delete dispensaries" ON dispensaries;
DROP POLICY IF EXISTS "Public read active dispensaries" ON dispensaries;
DROP POLICY IF EXISTS "Users can read own dispensary" ON dispensaries;

-- 6. CREATE INSERT POLICY - This is the key fix for the 400 error
-- Allows anyone (including unauthenticated/anonymous users) to insert
CREATE POLICY "Public insert dispensary" ON dispensaries
  FOR INSERT WITH CHECK (true);

-- 7. Admins can read all dispensaries
CREATE POLICY "Admins can read all dispensaries" ON dispensaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 8. Admins can update dispensaries
CREATE POLICY "Admins can update dispensaries" ON dispensaries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 9. Admins can delete dispensaries
CREATE POLICY "Admins can delete dispensaries" ON dispensaries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 10. Allow public to read active dispensaries
CREATE POLICY "Public read active dispensaries" ON dispensaries
  FOR SELECT USING (status = 'active');

-- 11. Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'dispensaries'
ORDER BY ordinal_position;

-- 12. Show current policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'dispensaries';
