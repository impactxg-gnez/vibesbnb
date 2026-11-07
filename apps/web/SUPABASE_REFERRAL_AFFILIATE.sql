-- Referral + affiliate v1. NEW TABLES ONLY.
-- Run in staging first. Do not run in production until Deontae approves.
-- Does not alter bookings, profiles, properties, or any existing table.

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_one_link_per_user
  ON public.referrals (referrer_user_id)
  WHERE referred_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS referrals_one_reward_per_guest
  ON public.referrals (referred_user_id)
  WHERE referred_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS referrals_code_idx ON public.referrals (code);
CREATE INDEX IF NOT EXISTS referrals_booking_idx ON public.referrals (booking_id);

CREATE TABLE IF NOT EXISTS public.referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  source_referral_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  used_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available'
);

CREATE INDEX IF NOT EXISTS referral_credits_user_idx ON public.referral_credits (user_id, status);
CREATE INDEX IF NOT EXISTS referral_credits_source_idx ON public.referral_credits (source_referral_id);

CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_email_lower_idx ON public.affiliates (lower(email));

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates (id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS affiliate_clicks_affiliate_idx
  ON public.affiliate_clicks (affiliate_id, clicked_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates (id) ON DELETE CASCADE,
  booking_id UUID NOT NULL UNIQUE,
  rent_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  stay_completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS affiliate_conversions_affiliate_idx
  ON public.affiliate_conversions (affiliate_id, status);

CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates (id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS affiliate_payouts_affiliate_idx
  ON public.affiliate_payouts (affiliate_id, period);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies. The service role bypasses RLS.
-- Guests never read these tables directly.

SELECT 'referral affiliate tables ready' AS status;
