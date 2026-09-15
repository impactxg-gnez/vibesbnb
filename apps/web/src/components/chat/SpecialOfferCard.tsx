'use client';

import Link from 'next/link';
import { Percent, Sparkles } from 'lucide-react';
import { HostPayoutBreakdown } from '@/components/host/HostPayoutBreakdown';
import type { SpecialOfferPayload } from '@/lib/specialOffer';
import { formatCalendarDate } from '@/lib/dateUtils';

function money(n: number) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function ymd(value?: string | null) {
  return value ? String(value).slice(0, 10) : '';
}

export function SpecialOfferCard({
  offer,
  isHostViewer,
  propertyId,
  conversationId,
  bookingId,
  bookingStatus,
  paymentStatus,
}: {
  offer: SpecialOfferPayload;
  isHostViewer: boolean;
  propertyId?: string | null;
  conversationId?: string | null;
  bookingId?: string | null;
  bookingStatus?: string | null;
  paymentStatus?: string | null;
}) {
  const stay =
    offer.checkIn && offer.checkOut
      ? `${formatCalendarDate(offer.checkIn, { month: 'short', day: 'numeric' })} → ${formatCalendarDate(offer.checkOut, { month: 'short', day: 'numeric', year: 'numeric' })}`
      : `${offer.nights} night${offer.nights === 1 ? '' : 's'}`;

  const status = String(bookingStatus || '').toLowerCase();
  const payment = String(paymentStatus || '').toLowerCase();
  const isPending = status === 'pending_approval' || status === 'pending';
  const isPayable =
    Boolean(bookingId) &&
    (status === 'accepted' || status === 'confirmed') &&
    payment !== 'paid' &&
    payment !== 'completed';

  const checkIn = ymd(offer.checkIn);
  const checkOut = ymd(offer.checkOut);
  const bookParams = new URLSearchParams();
  if (propertyId) bookParams.set('propertyId', propertyId);
  if (conversationId) bookParams.set('conversationId', conversationId);
  if (checkIn) bookParams.set('checkIn', checkIn);
  if (checkOut) bookParams.set('checkOut', checkOut);
  const bookHref = propertyId ? `/bookings/new?${bookParams.toString()}` : null;
  const payHref = bookingId ? `/bookings/pay/${encodeURIComponent(bookingId)}` : null;

  return (
    <div className="rounded-2xl border border-emerald-700/35 bg-[#D1FAE5] overflow-hidden min-w-[240px] dark:border-emerald-500/40 dark:bg-emerald-950/40">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-emerald-800/15 dark:border-emerald-500/20">
        <Sparkles className="w-4 h-4 text-[#166534] shrink-0 dark:text-emerald-400" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#14532D] dark:text-emerald-300">
          Special offer
        </p>
        {offer.discountPercent > 0 ? (
          <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-bold text-[#14532D] bg-emerald-700/15 px-2 py-0.5 rounded-full dark:text-emerald-200 dark:bg-emerald-500/20">
            <Percent className="w-3 h-3" />
            {offer.discountPercent}% off
          </span>
        ) : null}
      </div>
      <div className="px-3.5 py-3 space-y-2">
        <p className="text-[11px] text-[#166534] dark:text-emerald-200/80">{stay}</p>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-[#3F6212] dark:text-gray-400">Listed</span>
          <span className="text-sm text-[#3F6212] line-through dark:text-gray-400">
            {money(offer.originalNightly)}/night
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-[#14532D] dark:text-emerald-200">Offer</span>
          <span className="text-lg font-bold text-[#14532D] dark:text-white">
            {money(offer.offerNightly)}
            <span className="text-xs font-semibold text-[#166534] dark:text-emerald-300"> /night</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-emerald-900/10 dark:border-white/10">
          <span className="text-xs text-[#3F6212] dark:text-gray-400">Guest pays</span>
          <span className="text-sm font-semibold text-[#14532D] dark:text-white">{money(offer.guestTotal)}</span>
        </div>
        {isHostViewer ? (
          <HostPayoutBreakdown
            preview={{
              guestTotal: offer.guestTotal,
              lodgingGross: offer.lodgingGross,
              hostFee: offer.hostFee,
              hostAmount: offer.hostAmount,
              hostFeePercent: offer.hostFeePercent,
              nights: offer.nights,
            }}
            variant="dark"
            className="mt-2"
          />
        ) : (
          <div className="pt-2 space-y-2">
            {isPayable && payHref ? (
              <Link
                href={payHref}
                className="flex items-center justify-center min-h-11 w-full px-3 py-2.5 rounded-xl bg-[#193F25] text-[#FAF3EA] text-sm font-bold touch-manipulation dark:bg-emerald-600 dark:text-white"
              >
                Complete payment
              </Link>
            ) : isPending ? (
              <p className="text-[11px] text-[#166534] dark:text-emerald-200/70">
                This rate is on your request. You can complete booking after the host approves.
              </p>
            ) : bookHref ? (
              <>
                <p className="text-[11px] text-[#166534] dark:text-emerald-200/70">
                  Accept this stay and the discounted nightly rate applies to your booking.
                </p>
                <Link
                  href={bookHref}
                  className="flex items-center justify-center min-h-11 w-full px-3 py-2.5 rounded-xl bg-[#193F25] text-[#FAF3EA] text-sm font-bold touch-manipulation dark:bg-emerald-600 dark:text-white"
                >
                  Accept offer &amp; book
                </Link>
              </>
            ) : (
              <p className="text-[11px] text-[#166534] dark:text-emerald-200/70">
                Accept this stay and the discounted nightly rate applies to your booking.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
