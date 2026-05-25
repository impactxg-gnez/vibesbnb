-- =============================================
-- Reviews Table Updates for Admin Management
-- =============================================
-- Run this in Supabase SQL Editor

-- Add columns for team reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_team_review BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

-- Make user_id nullable for team reviews
ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing policies and recreate with proper permissions
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can insert team reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON reviews;

-- Policy: Approved reviews are viewable by everyone
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (status = 'approved');

-- Policy: Admins can view all reviews (including pending/rejected)
-- Requires public.is_vibesbnb_admin_jwt() from SUPABASE_ADMIN_REALTIME_RLS.sql
CREATE POLICY "Admins can view all reviews" ON reviews
  FOR SELECT USING (public.is_vibesbnb_admin_jwt());

-- Policy: Authenticated users can create reviews; admins can insert team reviews (user_id null)
CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR (public.is_vibesbnb_admin_jwt() AND is_team_review = true)
  );

-- Policy: Admins can update all reviews (approve/reject)
CREATE POLICY "Admins can update all reviews" ON reviews
  FOR UPDATE USING (public.is_vibesbnb_admin_jwt());

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Admins can delete reviews
CREATE POLICY "Admins can delete reviews" ON reviews
  FOR DELETE USING (public.is_vibesbnb_admin_jwt());

-- Grant permissions
GRANT ALL ON reviews TO authenticated;

SELECT 'Reviews table updated successfully!' AS status;
