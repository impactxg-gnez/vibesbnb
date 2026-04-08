-- =============================================
-- Add guest_access_type column to properties table
-- =============================================
-- Run this in Supabase SQL Editor to add the missing column

-- Add the guest_access_type column
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS guest_access_type TEXT;

-- Add beds column if missing
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS beds INTEGER DEFAULT 1;

-- Add rejection_reason column if missing (for admin rejections)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing properties with default value
UPDATE properties 
SET guest_access_type = 'An entire place' 
WHERE guest_access_type IS NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
AND column_name IN ('guest_access_type', 'beds', 'rejection_reason');
