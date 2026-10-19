-- Keep every reservation even if the guest or host account is later deleted.
-- Snapshot contact fields live on the booking row (not only on profiles).
-- Run this in Supabase Dashboard > SQL Editor.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_whatsapp TEXT;

COMMENT ON COLUMN public.bookings.guest_phone IS
  'Guest phone captured at booking time. Survives profile/account changes.';
COMMENT ON COLUMN public.bookings.guest_whatsapp IS
  'Guest WhatsApp captured at booking time. Survives profile/account changes.';

-- user_id / host_id currently ON DELETE CASCADE, which wipes reservations
-- when an account is removed. Keep the booking; null the account link.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'bookings'
      AND c.contype = 'f'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%user_id%auth.users%'
        OR pg_get_constraintdef(c.oid) ILIKE '%host_id%auth.users%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'host_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.bookings ALTER COLUMN host_id DROP NOT NULL';
  END IF;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'host_id'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_host_id_fkey
      FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

SELECT 'bookings now retain rows and guest contact after account deletion.' AS status;
