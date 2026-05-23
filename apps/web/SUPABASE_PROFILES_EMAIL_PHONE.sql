-- Add email and ensure phone are stored on profiles for admin / WhatsApp use.
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles (phone);

-- Backfill email from auth.users (service role / SQL editor only)
UPDATE profiles p
SET email = lower(trim(u.email))
FROM auth.users u
WHERE p.id = u.id
  AND u.email IS NOT NULL
  AND (p.email IS NULL OR p.email = '');

-- Backfill phone from auth user metadata when profiles.phone is empty
UPDATE profiles p
SET phone = nullif(trim(u.raw_user_meta_data->>'phone'), '')
FROM auth.users u
WHERE p.id = u.id
  AND (p.phone IS NULL OR p.phone = '')
  AND nullif(trim(u.raw_user_meta_data->>'phone'), '') IS NOT NULL;
