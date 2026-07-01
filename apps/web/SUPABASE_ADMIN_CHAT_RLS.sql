-- Admin read access for host–traveller chat (run in Supabase SQL Editor)
-- Prerequisite: is_vibesbnb_admin_jwt() from SUPABASE_ADMIN_REALTIME_RLS.sql

DO $$
BEGIN
  IF to_regclass('public.conversations') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
    CREATE POLICY "Admins can view all conversations"
      ON public.conversations FOR SELECT
      USING (public.is_vibesbnb_admin_jwt());
  END IF;

  IF to_regclass('public.messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
    CREATE POLICY "Admins can view all messages"
      ON public.messages FOR SELECT
      USING (public.is_vibesbnb_admin_jwt());
  END IF;
END $$;

SELECT 'Admin chat RLS policies applied.' AS status;
