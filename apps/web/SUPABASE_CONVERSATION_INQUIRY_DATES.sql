-- Persist the stay dates a traveller had selected when they opened chat with a host.
-- Safe to re-run.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS inquiry_check_in date,
  ADD COLUMN IF NOT EXISTS inquiry_check_out date;

COMMENT ON COLUMN public.conversations.inquiry_check_in IS
  'Traveller-selected check-in from the listing page when messaging the host (before/without a booking).';
COMMENT ON COLUMN public.conversations.inquiry_check_out IS
  'Traveller-selected check-out from the listing page when messaging the host (before/without a booking).';

SELECT 'conversations.inquiry_check_in / inquiry_check_out ready.' AS status;
