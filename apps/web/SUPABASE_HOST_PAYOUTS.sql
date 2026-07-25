-- Host payout ledger: pending / paid / cancelled per booking.
-- Run in Supabase SQL Editor on the SAME project as production
-- (Table Editor should list public.bookings and public.properties).

SET search_path TO public;

DO $$
BEGIN
  IF to_regclass('public.bookings') IS NULL THEN
    RAISE EXCEPTION
      'public.bookings not found. Open SQL Editor on the VibesBNB production Supabase project (confirm Table Editor lists bookings), then re-run this script.';
  END IF;
END $$;

-- property_id is text (no FK) to match bookings.property_id across UUID/text property id history
CREATE TABLE IF NOT EXISTS public.host_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT,
  guest_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  host_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  check_in DATE,
  check_out DATE,
  property_name TEXT,
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transfer_ref TEXT,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_host_payouts_host_status
  ON public.host_payouts (host_id, status);

CREATE INDEX IF NOT EXISTS idx_host_payouts_status
  ON public.host_payouts (status);

CREATE INDEX IF NOT EXISTS idx_host_payouts_host_id
  ON public.host_payouts (host_id);

ALTER TABLE public.host_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view own payouts" ON public.host_payouts;
CREATE POLICY "Hosts can view own payouts"
  ON public.host_payouts
  FOR SELECT
  USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Admins can view all host payouts" ON public.host_payouts;
CREATE POLICY "Admins can view all host payouts"
  ON public.host_payouts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.raw_user_meta_data->>'is_admin' = 'true'
      )
    )
  );

CREATE OR REPLACE FUNCTION public.update_host_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_host_payouts_updated_at ON public.host_payouts;
CREATE TRIGGER trg_host_payouts_updated_at
  BEFORE UPDATE ON public.host_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_host_payouts_updated_at();

-- Backfill pending rows for paid, non-cancelled bookings (approx fee split at 10%).
-- Refine amounts via app ensurePendingHostPayout on next payment / admin tools.
INSERT INTO public.host_payouts (
  booking_id,
  host_id,
  property_id,
  guest_total,
  platform_fee,
  host_amount,
  currency,
  status,
  check_in,
  check_out,
  property_name
)
SELECT
  b.id,
  b.host_id,
  b.property_id::text,
  COALESCE(b.total_price, 0),
  ROUND(COALESCE(b.total_price, 0) * 10.0 / 110.0, 2),
  ROUND(COALESCE(b.total_price, 0) - (COALESCE(b.total_price, 0) * 10.0 / 110.0), 2),
  'USD',
  'pending',
  b.check_in::date,
  b.check_out::date,
  b.property_name
FROM public.bookings b
WHERE b.payment_status = 'paid'
  AND b.status IN ('confirmed', 'completed', 'accepted')
  AND b.host_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.host_payouts hp WHERE hp.booking_id = b.id
  );

-- Paid-then-cancelled bookings → cancelled ledger rows
INSERT INTO public.host_payouts (
  booking_id,
  host_id,
  property_id,
  guest_total,
  platform_fee,
  host_amount,
  currency,
  status,
  check_in,
  check_out,
  property_name,
  cancelled_at,
  cancel_reason
)
SELECT
  b.id,
  b.host_id,
  b.property_id::text,
  COALESCE(b.total_price, 0),
  ROUND(COALESCE(b.total_price, 0) * 10.0 / 110.0, 2),
  ROUND(COALESCE(b.total_price, 0) - (COALESCE(b.total_price, 0) * 10.0 / 110.0), 2),
  'USD',
  'cancelled',
  b.check_in::date,
  b.check_out::date,
  b.property_name,
  NOW(),
  'Booking cancelled'
FROM public.bookings b
WHERE b.status = 'cancelled'
  AND b.payment_status IN ('paid', 'refunded')
  AND b.host_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.host_payouts hp WHERE hp.booking_id = b.id
  );
