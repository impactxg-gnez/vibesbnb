-- Check RLS Policies on Properties Table
-- Run this in Supabase Dashboard > SQL Editor
-- This is Step 3 from the diagnostic script

-- 1. Check if RLS is enabled on properties table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'properties';

-- 2. List all RLS policies on properties table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command_type,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'properties'
ORDER BY cmd, policyname;

-- 3. Check if policies allow inserts for authenticated users
-- This should show the "Hosts can insert their own properties" policy
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'properties' 
  AND cmd = 'INSERT';

-- 4. Test if current user can insert (run this while logged in as a host)
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User is authenticated'
    ELSE 'User is NOT authenticated'
  END as auth_status;

-- 5. Check if there are any properties that violate RLS (should return 0)
-- This checks if any properties have host_id that doesn't match auth.uid()
-- Note: This query might not work directly due to RLS, but you can check manually
SELECT COUNT(*) as properties_with_mismatched_host_id
FROM properties
WHERE host_id IS NOT NULL;

