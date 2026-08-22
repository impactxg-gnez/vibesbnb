-- Admin ban / enable flag on profiles (used by /admin/users and /api/admin/users).
-- Safe to re-run.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN profiles.enabled IS
  'When false, the account is disabled/banned from the platform (admin-managed).';

CREATE INDEX IF NOT EXISTS idx_profiles_enabled ON profiles (enabled);
