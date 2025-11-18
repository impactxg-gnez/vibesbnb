-- Delete All Properties from Supabase
-- WARNING: This will permanently delete ALL properties from the database
-- Run this in Supabase Dashboard > SQL Editor
-- 
-- This script is useful for testing/resetting the properties table
-- Make sure you have a backup if you need to restore any data

-- Option 1: Delete ALL properties (use with caution)
DELETE FROM properties;

-- Option 2: Delete properties for a specific host (safer option)
-- Uncomment and replace 'YOUR_HOST_ID_HERE' with the actual host_id UUID
-- DELETE FROM properties WHERE host_id = 'YOUR_HOST_ID_HERE';

-- Option 3: Delete properties created after a specific date
-- Uncomment and adjust the date as needed
-- DELETE FROM properties WHERE created_at > '2024-01-01';

-- Verify deletion (should return 0 rows)
SELECT COUNT(*) as remaining_properties FROM properties;

-- Show remaining properties (if any)
SELECT id, name, host_id, status, created_at FROM properties ORDER BY created_at DESC LIMIT 10;

