-- Special-offer nightly rate a host sends a guest from messages.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- When set, booking totals and host payouts use this rate instead of properties.price.

alter table public.bookings
  add column if not exists special_offer_nightly numeric;

comment on column public.bookings.special_offer_nightly is
  'Host-offered nightly rate for this booking, sent from messages. Null means the listing rate applies.';
