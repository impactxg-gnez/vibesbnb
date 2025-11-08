-- Migration Script: Update existing users to host role
-- Run this in Supabase Dashboard > SQL Editor
--
-- This script updates user metadata to set role='host' for existing users
-- You can modify the WHERE clause to target specific users

-- Option 1: Update all users (use with caution)
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"host"'
-- )
-- WHERE raw_user_meta_data->>'role' IS NULL 
--    OR raw_user_meta_data->>'role' != 'host';

-- Option 2: Update specific users by email (recommended)
-- Replace 'user@example.com' with actual email addresses
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"host"'
)
WHERE email IN (
  'user1@example.com',
  'user2@example.com'
  -- Add more email addresses here
)
AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' != 'host');

-- Option 3: Update users who have properties in localStorage (if you have a way to identify them)
-- This would require additional logic based on your data structure

-- Verify the update
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'host'
ORDER BY created_at DESC;

