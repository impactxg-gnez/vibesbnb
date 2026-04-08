-- =============================================
-- Storage Setup for Profile Pictures
-- =============================================
-- NOTE: Storage buckets cannot be created via SQL.
-- You MUST create the bucket via the Supabase Dashboard:
-- 
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: "profile-pictures" 
-- 4. Toggle "Public bucket" to ON
-- 5. Click "Create bucket"
-- 
-- THEN run this SQL to set up the policies:
-- =============================================

-- Allow authenticated users to upload their own profile pictures
-- Policy: Users can upload to their own folder (folder name = user ID)
CREATE POLICY "Users can upload own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view profile pictures (public bucket)
CREATE POLICY "Profile pictures are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Allow users to update/replace their own profile pictures
CREATE POLICY "Users can update own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================
-- Alternative: Quick setup using RLS disabled bucket
-- =============================================
-- If you prefer simpler setup, you can also:
-- 1. Create the bucket with "Public bucket" ON
-- 2. In bucket settings, disable RLS (not recommended for production)
-- 
-- For production, use the policies above for proper security.
