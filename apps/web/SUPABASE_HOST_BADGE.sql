-- Host status badges: SuperBud (top hosts) and VibeSetter (new hosts earning their reputation)
-- Run in Supabase SQL Editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS host_badge TEXT;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_host_badge_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_host_badge_check
  CHECK (host_badge IS NULL OR host_badge IN ('superbud', 'vibesetter'));

COMMENT ON COLUMN profiles.host_badge IS
  'superbud = SuperBud host; vibesetter = new host building reviews';

-- Grandfather all current hosts as SuperBuds (existing hosts + anyone with listings)
UPDATE profiles p
SET host_badge = 'superbud', updated_at = NOW()
WHERE p.host_badge IS NULL
  AND (
    p.role = 'host'
    OR EXISTS (
      SELECT 1 FROM properties pr
      WHERE pr.host_id = p.id
    )
  );
