-- Traveller preference: prioritize 420 / wellness-friendly accommodations in search.
-- Default ON (true). Run in Supabase SQL Editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS prefer_wellness_friendly BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.prefer_wellness_friendly IS
  'When true, wellness_friendly listings sort first in search; when false, non-wellness first.';
