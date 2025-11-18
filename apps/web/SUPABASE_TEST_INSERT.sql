-- Test Insert into Properties Table
-- Run this in Supabase Dashboard > SQL Editor
-- This will help verify if RLS policies are working correctly

-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- To get your user ID, run: SELECT id, email FROM auth.users;

-- Step 1: Get your user ID
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Test insert with your user ID (replace the UUID below)
-- This simulates what the application should be doing
INSERT INTO properties (
  id,
  host_id,
  name,
  title,
  description,
  location,
  price,
  status,
  bedrooms,
  bathrooms,
  guests,
  wellness_friendly
) VALUES (
  'test_' || gen_random_uuid()::text,
  'YOUR_USER_ID_HERE'::uuid,  -- Replace with your actual user ID
  'Test Property',
  'Test Property',
  'This is a test property to verify RLS policies',
  'Test Location',
  100,
  'draft',
  2,
  1,
  4,
  false
) RETURNING id, name, host_id, status;

-- Step 3: If the insert above fails, check RLS policies
-- The error message will tell you which policy is blocking the insert

-- Step 4: Verify the insert worked
SELECT id, name, host_id, status, created_at 
FROM properties 
WHERE name = 'Test Property'
ORDER BY created_at DESC;

-- Step 5: Clean up test data (optional)
-- DELETE FROM properties WHERE name = 'Test Property';

