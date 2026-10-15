-- Host-chosen public URLs: https://vibesbnb.com/{custom_slug} → /listings/{id}
-- Run this in Supabase Dashboard > SQL Editor.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS custom_slug TEXT;

COMMENT ON COLUMN properties.custom_slug IS
  'Optional unique public path segment. https://vibesbnb.com/{custom_slug} redirects to the listing.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_custom_slug
  ON properties (custom_slug)
  WHERE custom_slug IS NOT NULL AND custom_slug <> '';

SELECT 'custom_slug column added to properties.' AS status;
