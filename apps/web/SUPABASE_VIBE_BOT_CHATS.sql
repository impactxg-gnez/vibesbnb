-- Multiple VibeBot chats per traveler (New chat + past chats in the bot panel).
-- Run in Supabase Dashboard > SQL Editor after SUPABASE_VIBE_BOT.sql.

CREATE TABLE IF NOT EXISTS public.vibe_bot_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vibe_bot_chats_user_updated
  ON public.vibe_bot_chats (user_id, last_message_at DESC);

ALTER TABLE public.vibe_bot_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.vibe_bot_chats(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vibe_bot_messages_conversation
  ON public.vibe_bot_messages (conversation_id, created_at);

-- Fold existing one-blob history into a single chat per user.
DO $$
DECLARE
  r RECORD;
  cid UUID;
  first_user TEXT;
  last_body TEXT;
  last_at TIMESTAMPTZ;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id
    FROM public.vibe_bot_messages
    WHERE conversation_id IS NULL
  LOOP
    SELECT body INTO first_user
    FROM public.vibe_bot_messages
    WHERE user_id = r.user_id AND role = 'user'
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT body, created_at INTO last_body, last_at
    FROM public.vibe_bot_messages
    WHERE user_id = r.user_id
    ORDER BY created_at DESC
    LIMIT 1;

    INSERT INTO public.vibe_bot_chats (user_id, title, last_message, last_message_at)
    VALUES (
      r.user_id,
      LEFT(COALESCE(NULLIF(TRIM(first_user), ''), 'Previous chat'), 80),
      LEFT(COALESCE(last_body, ''), 280),
      COALESCE(last_at, NOW())
    )
    RETURNING id INTO cid;

    UPDATE public.vibe_bot_messages
    SET conversation_id = cid
    WHERE user_id = r.user_id AND conversation_id IS NULL;
  END LOOP;
END $$;

ALTER TABLE public.vibe_bot_chats ENABLE ROW LEVEL SECURITY;

SELECT 'VibeBot multi-chat tables ready (API uses service role).' AS status;
