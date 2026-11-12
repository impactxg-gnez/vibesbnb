'use client';

import { useMemo, useState } from 'react';
import { Calendar, Percent, Sparkles, Users, X } from 'lucide-react';
import { HostPayoutBreakdown } from '@/components/host/HostPayoutBreakdown';
import {
  MAX_OFFER_DISCOUNT_PERCENT,
  discountPercentFromOffer,
  offerNightlyFromDiscount,
  previewSpecialOfferPayout,
  stayNightsFromDates,
  type SpecialOfferContext,
} from '@/lib/specialOffer';

export function SpecialOfferComposer({
  context,
  sending,
  onCancel,
  onSend,
}: {
  context: SpecialOfferContext;
  sending: boolean;
  onCancel: () => void;
  onSend: (payload: {
    offerNightly: number;
    discountPercent: number;
    checkIn: string | null;
    checkOut: string | null;
    guests: number;
  }) => void;
}) {
  const listed = Math.max(1, Number(context.listedNightly) || 0);
  const [offerNightly, setOfferNightly] = useState(listed);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [checkIn, setCheckIn] = useState(context.checkIn ? String(context.checkIn).slice(0, 10) : '');
  const [checkOut, setCheckOut] = useState(context.checkOut ? String(context.checkOut).slice(0, 10) : '');
  const [guests, setGuests] = useState(Math.max(1, Number(context.guests) || 1));

  const hasInvalidDates = Boolean(checkIn && checkOut && checkOut <= checkIn);

  const nights = useMemo(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      return stayNightsFromDates(checkIn, checkOut);
    }
    return Math.max(1, context.nights || 1);
  }, [checkIn, checkOut, context.nights]);

  const preview = useMemo(
    () =>
      previewSpecialOfferPayout({
        offerNightly,
        nights,
        cleaningFee: context.cleaningFee,
        serviceFeePercent: context.serviceFeePercent,
        hostFeePercent: context.hostFeePercent,
      }),
    [offerNightly, nights, context.cleaningFee, context.serviceFeePercent, context.hostFeePercent]
  );

  const applyAmount = (raw: number) => {
    const next = Math.max(1, Math.round(raw * 100) / 100);
    setOfferNightly(next);
    setDiscountPercent(discountPercentFromOffer(listed, next));
  };

  const applyDiscount = (raw: number) => {
    const pct = Math.min(MAX_OFFER_DISCOUNT_PERCENT, Math.max(0, raw));
    setDiscountPercent(pct);
    setOfferNightly(offerNightlyFromDiscount(listed, pct));
  };

  const handleSend = () => {
    if (hasInvalidDates || offerNightly <= 0 || guests < 1) return;
    onSend({
      offerNightly,
      discountPercent,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      guests,
    });
  };

  return (
    <div className="mb-3 rounded-xl border border-emerald-800/25 bg-[#D1FAE5] p-3 space-y-3 dark:border-emerald-500/30 dark:bg-emerald-950/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#14532D] flex items-center gap-1.5 dark:text-emerald-300">
          <Sparkles className="w-3.5 h-3.5" />
          Special offer
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-[#166534] hover:text-[#14532D] dark:text-emerald-200/70 dark:hover:text-white"
          aria-label="Close special offer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dates and Guests selector at the top */}
      <div className="pt-0.5 space-y-2 border-b border-emerald-800/15 pb-3 dark:border-emerald-500/20">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide font-bold text-[#3F6212] dark:text-emerald-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Offer Dates &amp; Guests
          </span>
          {nights > 0 && !hasInvalidDates && (
            <span className="font-semibold text-[#14532D] bg-emerald-700/15 px-2 py-0.5 rounded-full normal-case text-[11px] dark:text-emerald-300 dark:bg-emerald-500/20">
              {nights} night{nights === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-[#3F6212] mb-1 dark:text-gray-400">
              Check-in
            </span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF3EA] border border-[#51372B]/20 text-[#51372B] text-xs font-medium focus:ring-1 focus:ring-emerald-600 focus:outline-none dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-[#3F6212] mb-1 dark:text-gray-400">
              Check-out
            </span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF3EA] border border-[#51372B]/20 text-[#51372B] text-xs font-medium focus:ring-1 focus:ring-emerald-600 focus:outline-none dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#3F6212] mb-1 dark:text-gray-400">
              <Users className="w-3 h-3" />
              Guests
            </span>
            <input
              type="number"
              min={1}
              max={context.maxPropertyGuests || 30}
              step={1}
              value={guests}
              onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF3EA] border border-[#51372B]/20 text-[#51372B] text-xs font-medium focus:ring-1 focus:ring-emerald-600 focus:outline-none dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
          </label>
        </div>

        {hasInvalidDates ? (
          <p className="text-[11px] text-red-600 font-medium dark:text-red-400">
            Check-out date must be after check-in date.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[140px]">
          <span className="block text-[10px] uppercase tracking-wide text-[#3F6212] mb-1 dark:text-gray-400">
            Price for this guest / night
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5346] text-sm dark:text-gray-400">$</span>
            <input
              type="number"
              min={1}
              max={listed}
              step={1}
              value={offerNightly}
              onChange={(e) => applyAmount(parseFloat(e.target.value) || 0)}
              className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#FAF3EA] border border-[#51372B]/20 text-[#51372B] text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
          </div>
          <span className="mt-1 block text-[10px] text-[#3F6212] dark:text-gray-500">
            Listed {listed.toFixed(0)}/night
          </span>
        </label>

        <label className="flex-[1.4] min-w-[180px]">
          <span className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[#3F6212] mb-1 dark:text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Percent className="w-3 h-3" />
              Discount
            </span>
            <span className="text-[#14532D] font-bold normal-case tracking-normal text-sm dark:text-emerald-300">
              {discountPercent}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={MAX_OFFER_DISCOUNT_PERCENT}
            step={1}
            value={discountPercent}
            onChange={(e) => applyDiscount(Number(e.target.value))}
            className="w-full accent-emerald-700 h-2 dark:accent-emerald-500"
          />
        </label>
      </div>

      <HostPayoutBreakdown preview={preview} variant="dark" />

      <button
        type="button"
        disabled={sending || offerNightly <= 0 || hasInvalidDates || guests < 1}
        onClick={handleSend}
        className="w-full h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
      >
        {sending ? 'Sending offer…' : 'Send special offer'}
      </button>
    </div>
  );
}
