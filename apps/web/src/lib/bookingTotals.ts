import { nightsBetweenYmd } from '@/lib/dateUtils';
import {
  buildBookingQuoteFromProperty,
  resolveHostNightlyRate,
  type WellnessQuoteLine,
} from '@/lib/bookingQuote';

export function computeBookingGrandTotal(params: {
  propertyNightlyPrice: number;
  cleaningFee: number;
  checkInYmd: string;
  checkOutYmd: string;
  selectedUnits: Array<{ price?: unknown }> | null | undefined;
  wellnessLineItems: Array<{ price: number }>;
  /** Property max guests (included in base rate). */
  includedGuests?: number;
  adults?: number;
  kids?: number;
  pets?: number;
  allowExtraGuests?: boolean;
  extraGuestPrice?: number;
  refundableDeposit?: number;
  applyCardFee?: boolean;
}): { stayNights: number; grandTotal: number } {
  const quote = buildBookingQuoteFromProperty({
    property: {
      price: params.propertyNightlyPrice,
      cleaning_fee: params.cleaningFee,
      guests: params.includedGuests,
      allow_extra_guests: params.allowExtraGuests,
      extra_guest_price: params.extraGuestPrice,
      refundable_deposit: params.refundableDeposit,
    },
    checkInYmd: params.checkInYmd,
    checkOutYmd: params.checkOutYmd,
    selectedUnits: params.selectedUnits,
    adults: params.adults ?? 1,
    kids: params.kids,
    pets: params.pets,
    wellnessLineItems: params.wellnessLineItems as WellnessQuoteLine[],
    applyCardFee: params.applyCardFee,
  });

  const stayNights = nightsBetweenYmd(params.checkInYmd, params.checkOutYmd);
  if (!quote) {
    return { stayNights, grandTotal: 0 };
  }
  return { stayNights, grandTotal: quote.grandTotal };
}

export { resolveHostNightlyRate };

export function totalsMatchCents(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}
