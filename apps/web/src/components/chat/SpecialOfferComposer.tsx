'use client';

import { useMemo, useState } from 'react';
import { Percent, Sparkles, X } from 'lucide-react';
import { HostPayoutBreakdown } from '@/components/host/HostPayoutBreakdown';
import {
  MAX_OFFER_DISCOUNT_PERCENT,
  discountPercentFromOffer,
  offerNightlyFromDiscount,
  previewSpecialOfferPayout,
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
  onSend: (offerNightly: number, discountPercent: number) => void;
}) {
  const listed = Math.max(1, Number(context.listedNightly) || 0);
  const [offerNightly, setOfferNightly] = useState(listed);
  const [discountPercent, setDiscountPercent] = useState(0);

  const preview = useMemo(
    () =>
      previewSpecialOfferPayout({
        offerNightly,
        nights: context.nights,
        cleaningFee: context.cleaningFee,
        serviceFeePercent: context.serviceFeePercent,
        hostFeePercent: context.hostFeePercent,
      }),
    [offerNightly, context]
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

  return (
    <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Special offer
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-emerald-200/70 hover:text-white"
          aria-label="Close special offer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[140px]">
          <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">
            Price for this guest / night
          </span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min={1}
              max={listed}
              step={1}
              value={offerNightly}
              onChange={(e) => applyAmount(parseFloat(e.target.value) || 0)}
              className="w-full pl-7 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm"
            />
          </div>
          <span className="mt-1 block text-[10px] text-gray-500">
            Listed {listed.toFixed(0)}/night
          </span>
        </label>

        <label className="flex-[1.4] min-w-[180px]">
          <span className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-400 mb-1">
            <span className="inline-flex items-center gap-1">
              <Percent className="w-3 h-3" />
              Discount
            </span>
            <span className="text-emerald-300 font-bold normal-case tracking-normal text-sm">
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
            className="w-full accent-emerald-500 h-2"
          />
        </label>
      </div>

      <HostPayoutBreakdown preview={preview} variant="dark" />

      <button
        type="button"
        disabled={sending || offerNightly <= 0}
        onClick={() => onSend(offerNightly, discountPercent)}
        className="w-full h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
      >
        {sending ? 'Sending offer…' : 'Send special offer'}
      </button>
    </div>
  );
}
