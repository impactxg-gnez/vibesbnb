-- Email / SMS capture for visitors who browse a listing but do not book.
-- Run this in Supabase Dashboard > SQL Editor.

CREATE TABLE IF NOT EXISTS public.listing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'listing_exit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_leads_created_at
  ON public.listing_leads (created_at DESC);

ALTER TABLE public.listing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages listing leads" ON public.listing_leads;

COMMENT ON TABLE public.listing_leads IS
  'Opt-in email/SMS captures from listing pages (visitors who did not complete a booking).';

SELECT 'listing_leads table ready.' AS status;
