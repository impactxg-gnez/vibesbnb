-- Persist the guest count a traveller had selected when they opened chat with a host.
-- Safe to re-run.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS inquiry_guests integer DEFAULT 1;

COMMENT ON COLUMN public.conversations.inquiry_guests IS
  'Traveller-selected guest count from the listing page when messaging the host (before/without a booking).';

SELECT 'conversations.inquiry_guests ready.' AS status;
