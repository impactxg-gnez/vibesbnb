-- VibeBot (on-site concierge) message history per signed-in traveler.
-- Run in Supabase Dashboard > SQL Editor.

CREATE TABLE IF NOT EXISTS public.vibe_bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  body TEXT NOT NULL,
  listings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vibe_bot_messages_user_created
  ON public.vibe_bot_messages (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.vibe_bot_threads (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  guest_read_at TIMESTAMPTZ
);

ALTER TABLE public.vibe_bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_bot_threads ENABLE ROW LEVEL SECURITY;

SELECT 'VibeBot tables ready (API uses service role).' AS status;
