-- Check Properties in Supabase
-- Run this in Supabase Dashboard > SQL Editor to verify properties are being saved

-- 1. Count total properties
SELECT COUNT(*) as total_properties FROM properties;

-- 2. Show all properties with host information
SELECT 
  p.id,
  p.name,
  p.host_id,
  p.status,
  p.created_at,
  p.updated_at,
  u.email as host_email
FROM properties p
LEFT JOIN auth.users u ON p.host_id = u.id
ORDER BY p.created_at DESC
LIMIT 20;

-- 3. Count properties by host
SELECT 
  p.host_id,
  u.email as host_email,
  COUNT(*) as property_count
FROM properties p
LEFT JOIN auth.users u ON p.host_id = u.id
GROUP BY p.host_id, u.email
ORDER BY property_count DESC;

-- 4. Check for properties without host_id (should be 0)
SELECT COUNT(*) as properties_without_host_id
FROM properties
WHERE host_id IS NULL;

-- 5. Check RLS policies on properties table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'properties';

-- 6. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'properties';

