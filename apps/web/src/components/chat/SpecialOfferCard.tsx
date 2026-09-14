'use client';

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

export function SpecialOfferCard({
  offer,
  isHostViewer,
}: {
  offer: SpecialOfferPayload;
  isHostViewer: boolean;
}) {
  const stay =
    offer.checkIn && offer.checkOut
      ? `${formatCalendarDate(offer.checkIn, { month: 'short', day: 'numeric' })} → ${formatCalendarDate(offer.checkOut, { month: 'short', day: 'numeric', year: 'numeric' })}`
      : `${offer.nights} night${offer.nights === 1 ? '' : 's'}`;

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 overflow-hidden min-w-[240px]">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-emerald-500/20">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
          Special offer
        </p>
        {offer.discountPercent > 0 ? (
          <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full">
            <Percent className="w-3 h-3" />
            {offer.discountPercent}% off
          </span>
        ) : null}
      </div>
      <div className="px-3.5 py-3 space-y-2">
        <p className="text-[11px] text-emerald-200/80">{stay}</p>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-gray-400">Listed</span>
          <span className="text-sm text-gray-400 line-through">
            {money(offer.originalNightly)}/night
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-emerald-200">Offer</span>
          <span className="text-lg font-bold text-white">
            {money(offer.offerNightly)}
            <span className="text-xs font-semibold text-emerald-300"> /night</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-white/10">
          <span className="text-xs text-gray-400">Guest pays</span>
          <span className="text-sm font-semibold text-white">{money(offer.guestTotal)}</span>
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
          <p className="text-[11px] text-emerald-200/70 pt-1">
            Accept this stay and the discounted nightly rate applies to your booking.
          </p>
        )}
      </div>
    </div>
  );
}
