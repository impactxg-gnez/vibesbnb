-- Migration to add VibesBNB Take and Host Profile enhancements

-- Add vibesbnb_take to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS vibesbnb_take TEXT;

-- Enhance profiles table with contact info (visible only to host/admin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS host_email TEXT;

-- Policies for profiles
-- Ensure public can see names and bios, but limited fields for others can be handled in application layer
