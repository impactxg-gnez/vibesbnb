'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Leaf } from 'lucide-react';
import type { BookingQuote, WellnessQuoteLine } from '@/lib/bookingQuote';
import { formatCalendarDate } from '@/lib/dateUtils';

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatStayDate(ymd: string): string {
  return formatCalendarDate(ymd, { month: 'short', day: 'numeric', year: 'numeric' });
}

export type ReservationQuoteProps = {
  propertyName: string;
  checkInYmd: string;
  checkOutYmd: string;
  quote: BookingQuote;
  selectedUnits?: Array<{ id: string; name: string; price: number }>;
  showCardFee?: boolean;
  compact?: boolean;
};

export function ReservationQuote({
  propertyName,
  checkInYmd,
  checkOutYmd,
  quote,
  selectedUnits,
  showCardFee = false,
  compact = false,
}: ReservationQuoteProps) {
  const [taxesOpen, setTaxesOpen] = useState(false);
  const hasTaxes = quote.salesTax > 0 || quote.touristTax > 0;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Property</p>
          <p className="text-white font-medium leading-snug">{propertyName}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Check in</p>
            <p className="text-white">{formatStayDate(checkInYmd)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Check out</p>
            <p className="text-white">{formatStayDate(checkOutYmd)}</p>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400"># of nights</span>
          <span className="text-white">{quote.nights}</span>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Party size</p>
          <p className="text-white text-sm">
            {quote.adults} {quote.adults === 1 ? 'adult' : 'adults'}
            {quote.kids > 0 ? ` · ${quote.kids} ${quote.kids === 1 ? 'kid' : 'kids'}` : ''}
            {quote.pets > 0 ? ` · ${quote.pets} ${quote.pets === 1 ? 'pet' : 'pets'}` : ''}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4 space-y-2 text-sm">
        {selectedUnits && selectedUnits.length > 0 ? (
          <div className="space-y-2 mb-2 p-3 bg-gray-800/40 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Units</p>
            {selectedUnits.map((unit) => (
              <div key={unit.id} className="flex justify-between gap-2">
                <span className="text-gray-300 truncate">{unit.name}</span>
                <span className="text-white shrink-0">{money(unit.price)}/night</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex justify-between font-semibold text-white">
          <span>Total rent</span>
          <span>{money(quote.totalRent)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Nightly rate</span>
          <span className="text-white">{money(quote.hostNightlyRate)}</span>
        </div>

        <div className="flex justify-between text-gray-400">
          <span>Platform fee ({quote.platformFeePercent}%)</span>
          <span className="text-white">{money(quote.platformFee)}</span>
        </div>

        {quote.extraGuestCharges > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>
              Extra guests ({quote.extraGuestCount} × {quote.nights}{' '}
              {quote.nights === 1 ? 'night' : 'nights'})
            </span>
            <span className="text-white">{money(quote.extraGuestCharges)}</span>
          </div>
        )}

        {quote.wellnessLineItems.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-400 uppercase tracking-wider">
              <Leaf size={14} />
              Dispensary supplies
            </div>
            {quote.wellnessLineItems.map((line: WellnessQuoteLine, idx) => (
              <div key={`${line.name}-${idx}`} className="flex justify-between gap-2 pl-1">
                <span className="text-gray-400 truncate" title={line.name}>
                  {line.name}
                </span>
                <span className="text-white shrink-0">{money(line.price)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between font-medium text-white pt-2 border-t border-gray-800/80">
          <span>Taxable amount</span>
          <span>{money(quote.taxableAmount)}</span>
        </div>

        {hasTaxes && (
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setTaxesOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800/50 transition"
              aria-expanded={taxesOpen}
            >
              <span className="flex items-center gap-2 font-medium text-white">
                {taxesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Taxes
              </span>
              <span className="text-white font-medium">
                {money(quote.salesTax + quote.touristTax)}
              </span>
            </button>
            {taxesOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-gray-800 bg-gray-800/30">
                <div className="flex justify-between text-sm text-gray-400 pt-2">
                  <span>Sales tax ({quote.salesTaxPercent}%)</span>
                  <span className="text-white">{money(quote.salesTax)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Tourist &amp; development tax ({quote.touristTaxPercent}%)</span>
                  <span className="text-white">{money(quote.touristTax)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {quote.cleaningFee > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Cleaning</span>
            <span className="text-white">{money(quote.cleaningFee)}</span>
          </div>
        )}

        {showCardFee && quote.cardFee > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Credit card fee ({quote.cardFeePercent}%)</span>
            <span className="text-white">{money(quote.cardFee)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 pt-4 space-y-2">
        <div className="flex justify-between text-lg font-bold text-white">
          <span>Grand total</span>
          <span>{money(quote.grandTotal)}</span>
        </div>
        {quote.refundableDeposit > 0 && (
          <div className="flex justify-between text-sm font-semibold text-amber-200/90">
            <span>Refundable deposit</span>
            <span>{money(quote.refundableDeposit)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
