-- Smoking policy: host selects inside and/or outside. Run in Supabase SQL Editor.
-- Fixes: "Could not find the 'smoking_inside_allowed' column of 'properties' in the schema cache"
--
-- After running: wait ~1 min or in Dashboard use API settings to refresh schema if inserts still fail.

-- App still writes smoke_friendly alongside the granular flags; ensure column exists for legacy UPDATE below.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS smoke_friendly BOOLEAN DEFAULT false;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS smoking_inside_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoking_outside_allowed BOOLEAN NOT NULL DEFAULT false;

-- Legacy: single smoke_friendly flag implied some smoking allowed; default to outside-only.
UPDATE properties
SET smoking_outside_allowed = true
WHERE COALESCE(smoke_friendly, false) = true
  AND smoking_inside_allowed = false
  AND smoking_outside_allowed = false;
