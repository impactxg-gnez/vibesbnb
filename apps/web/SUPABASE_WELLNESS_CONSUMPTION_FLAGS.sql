-- Per-listing toggles for the guest-facing 🌿 INDOOR / OUTDOOR consumption pill (shown only when at least one is true).
-- Run in Supabase SQL Editor alongside the web app deploy.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS wellness_consumption_indoor_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wellness_consumption_outdoor_allowed boolean NOT NULL DEFAULT false;
