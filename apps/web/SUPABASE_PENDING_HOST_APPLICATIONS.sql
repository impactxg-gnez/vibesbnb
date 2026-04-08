-- =============================================
-- Pending Host Applications Table
-- =============================================
-- Run this in Supabase SQL Editor to create the pending_host_applications table
-- This table stores host registration applications pending admin approval

-- Create the pending_host_applications table
CREATE TABLE IF NOT EXISTS pending_host_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  property_name TEXT,
  property_type TEXT,
  location TEXT,
  description TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add notes column if it doesn't exist (for existing tables)
ALTER TABLE pending_host_applications ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_host_applications_status ON pending_host_applications(status);
CREATE INDEX IF NOT EXISTS idx_pending_host_applications_email ON pending_host_applications(email);
CREATE INDEX IF NOT EXISTS idx_pending_host_applications_created_at ON pending_host_applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE pending_host_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all host applications" ON pending_host_applications;
DROP POLICY IF EXISTS "Admins can update host applications" ON pending_host_applications;
DROP POLICY IF EXISTS "Anyone can submit host application" ON pending_host_applications;
DROP POLICY IF EXISTS "Users can view own application" ON pending_host_applications;

-- Policy: Admins can view all applications (using JWT metadata)
CREATE POLICY "Admins can view all host applications"
  ON pending_host_applications
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Policy: Admins can update applications (approve/reject)
CREATE POLICY "Admins can update host applications"
  ON pending_host_applications
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Policy: Anyone can insert (submit application)
CREATE POLICY "Anyone can submit host application"
  ON pending_host_applications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view their own application by email
CREATE POLICY "Users can view own application"
  ON pending_host_applications
  FOR SELECT
  USING (
    email = (auth.jwt() ->> 'email')
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_host_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_pending_host_applications_updated_at ON pending_host_applications;
CREATE TRIGGER trigger_pending_host_applications_updated_at
  BEFORE UPDATE ON pending_host_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_host_applications_updated_at();

-- Grant necessary permissions
GRANT ALL ON pending_host_applications TO authenticated;
GRANT INSERT ON pending_host_applications TO anon;

-- Verify the table was created
SELECT 'pending_host_applications table created successfully!' AS status;
