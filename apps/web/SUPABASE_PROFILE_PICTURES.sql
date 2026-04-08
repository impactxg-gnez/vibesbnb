-- Profile Pictures Table with Approval Workflow
-- Run this in Supabase SQL Editor

-- Create pending_profile_pictures table
CREATE TABLE IF NOT EXISTS pending_profile_pictures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_profile_pictures_user_id ON pending_profile_pictures(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_profile_pictures_status ON pending_profile_pictures(status);

-- Add avatar_url and avatar_status columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_status TEXT DEFAULT 'none' CHECK (avatar_status IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_avatar_url TEXT;

-- Enable RLS
ALTER TABLE pending_profile_pictures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile picture submissions" ON pending_profile_pictures;
DROP POLICY IF EXISTS "Users can insert own profile picture" ON pending_profile_pictures;
DROP POLICY IF EXISTS "Admins can view all profile pictures" ON pending_profile_pictures;
DROP POLICY IF EXISTS "Admins can update profile pictures" ON pending_profile_pictures;

-- RLS Policies
-- Users can view their own submissions
CREATE POLICY "Users can view own profile picture submissions"
  ON pending_profile_pictures FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile pictures
CREATE POLICY "Users can insert own profile picture"
  ON pending_profile_pictures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all profile pictures
CREATE POLICY "Admins can view all profile pictures"
  ON pending_profile_pictures FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Admins can update profile pictures (approve/reject)
CREATE POLICY "Admins can update profile pictures"
  ON pending_profile_pictures FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Create storage bucket for profile pictures (run this separately in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true);

-- Storage policies (run in Supabase Dashboard > Storage > Policies)
-- Allow authenticated users to upload to their own folder
-- Allow public read access to approved images
