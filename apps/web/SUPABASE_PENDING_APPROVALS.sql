-- Pending Approvals System for Hosts and Dispensaries
-- Run this in Supabase Dashboard > SQL Editor
-- This allows admin-only approval without email verification

-- 1. Create pending_host_applications table
CREATE TABLE IF NOT EXISTS pending_host_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_host_applications_status ON pending_host_applications(status);
CREATE INDEX IF NOT EXISTS idx_pending_host_applications_email ON pending_host_applications(email);

-- 3. Enable RLS
ALTER TABLE pending_host_applications ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Admins can read all
CREATE POLICY "Admins can read all pending host applications" ON pending_host_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 5. Policy: Admins can update
CREATE POLICY "Admins can update pending host applications" ON pending_host_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 6. Policy: Anyone can insert (for signups)
CREATE POLICY "Anyone can insert pending host applications" ON pending_host_applications
  FOR INSERT WITH CHECK (true);

-- 7. Ensure dispensaries table exists with proper structure
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- 8. Add missing columns to dispensaries if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispensaries' AND column_name = 'email') THEN
    ALTER TABLE dispensaries ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dispensaries' AND column_name = 'owner_name') THEN
    ALTER TABLE dispensaries ADD COLUMN owner_name TEXT;
  END IF;
END $$;

-- 9. Enable RLS on dispensaries
ALTER TABLE dispensaries ENABLE ROW LEVEL SECURITY;

-- 10. Policy: Anyone can insert dispensary applications (including anonymous users)
DROP POLICY IF EXISTS "Anyone can insert dispensary applications" ON dispensaries;
CREATE POLICY "Anyone can insert dispensary applications" ON dispensaries
  FOR INSERT TO public WITH CHECK (true);

-- 10b. Explicitly allow anon role to insert
DROP POLICY IF EXISTS "Anonymous can insert dispensary applications" ON dispensaries;
CREATE POLICY "Anonymous can insert dispensary applications" ON dispensaries
  FOR INSERT TO anon WITH CHECK (true);

-- 11. Policy: Admins can read all dispensaries
DROP POLICY IF EXISTS "Admins can read all dispensaries" ON dispensaries;
CREATE POLICY "Admins can read all dispensaries" ON dispensaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 12. Policy: Admins can update dispensaries
DROP POLICY IF EXISTS "Admins can update dispensaries" ON dispensaries;
CREATE POLICY "Admins can update dispensaries" ON dispensaries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 13. Policy: Users can read their own dispensary
DROP POLICY IF EXISTS "Users can read own dispensary" ON dispensaries;
CREATE POLICY "Users can read own dispensary" ON dispensaries
  FOR SELECT USING (user_id = auth.uid() OR status = 'active');

-- 14. Policy: Anonymous users can read active dispensaries (for public listings)
DROP POLICY IF EXISTS "Anonymous can read active dispensaries" ON dispensaries;
CREATE POLICY "Anonymous can read active dispensaries" ON dispensaries
  FOR SELECT TO anon USING (status = 'active');

-- 15. Admins can delete dispensaries
DROP POLICY IF EXISTS "Admins can delete dispensaries" ON dispensaries;
CREATE POLICY "Admins can delete dispensaries" ON dispensaries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Verify tables
SELECT 'pending_host_applications' as table_name, COUNT(*) as row_count FROM pending_host_applications
UNION ALL
SELECT 'dispensaries' as table_name, COUNT(*) as row_count FROM dispensaries;

