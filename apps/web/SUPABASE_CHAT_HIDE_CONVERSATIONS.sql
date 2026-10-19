-- Per-user inbox cleanup: hiding a thread does not delete it for the other party.
-- Run this in Supabase Dashboard > SQL Editor.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS host_hidden_at TIMESTAMPTZ;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS traveller_hidden_at TIMESTAMPTZ;

COMMENT ON COLUMN public.conversations.host_hidden_at IS
  'When set, the host has removed this thread from their inbox. Cleared if the guest sends a new message.';
COMMENT ON COLUMN public.conversations.traveller_hidden_at IS
  'When set, the traveller has removed this thread from their inbox. Cleared if the host sends a new message.';

SELECT 'conversation hide columns added.' AS status;
