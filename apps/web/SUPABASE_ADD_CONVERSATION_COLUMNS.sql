-- Fix for 'column conversations.host_name does not exist' error
-- Run this in your Supabase SQL Editor

-- Add missing columns to conversations table if they don't exist
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS host_name TEXT,
  ADD COLUMN IF NOT EXISTS host_avatar TEXT,
  ADD COLUMN IF NOT EXISTS traveller_name TEXT,
  ADD COLUMN IF NOT EXISTS traveller_avatar TEXT;

-- Update existing rows if possible (optional, but helps populate data)
-- Note: This is a best-effort update. Future conversations will be populated by the application logic.
