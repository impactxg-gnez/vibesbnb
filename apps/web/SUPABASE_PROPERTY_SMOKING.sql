-- Smoking policy: host selects inside and/or outside. Run in Supabase SQL Editor.
-- Listing pages read smoking_inside_allowed / smoking_outside_allowed.
-- smoke_friendly is kept in sync as (inside OR outside) for older code paths.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS smoking_inside_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoking_outside_allowed BOOLEAN NOT NULL DEFAULT false;

-- Legacy: single smoke_friendly flag implied some smoking allowed; default to outside-only.
UPDATE properties
SET smoking_outside_allowed = true
WHERE COALESCE(smoke_friendly, false) = true
  AND smoking_inside_allowed = false
  AND smoking_outside_allowed = false;
