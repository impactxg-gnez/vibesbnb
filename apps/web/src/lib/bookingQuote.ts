import {
  PAYPAL_CARD_FEE_PERCENT,
  SALES_TAX_PERCENT,
  TOURIST_DEVELOPMENT_TAX_PERCENT,
} from '@vibesbnb/shared';
import { nightsBetweenYmd } from '@/lib/dateUtils';
import { getPlatformFeePercent } from '@/lib/platformPricing';

export type WellnessQuoteLine = { id?: string; name: string; price: number };

export type BookingQuoteInput = {
  checkInYmd: string;
  checkOutYmd: string;
  hostNightlyRate: number;
  hostCleaningFee?: number;
  refundableDeposit?: number;
  allowExtraGuests?: boolean;
  extraGuestPrice?: number;
  includedGuests?: number;
  adults?: number;
  kids?: number;
  pets?: number;
  wellnessLineItems?: WellnessQuoteLine[];
  /** When true, include PayPal card processing fee in grand total. */
  applyCardFee?: boolean;
  feePercent?: number;
};

export type BookingQuote = {
  nights: number;
  hostNightlyRate: number;
  totalRent: number;
  platformFee: number;
  platformFeePercent: number;
  extraGuestCount: number;
  extraGuestCharges: number;
  wellnessLineItems: WellnessQuoteLine[];
  wellnessTotal: number;
  taxableAmount: number;
  salesTax: number;
  salesTaxPercent: number;
  touristTax: number;
  touristTaxPercent: number;
  cleaningFee: number;
  cardFee: number;
  cardFeePercent: number;
  grandTotal: number;
  refundableDeposit: number;
  adults: number;
  kids: number;
  pets: number;
};

function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function computeExtraGuestCharges(params: {
  allowExtraGuests: boolean;
  includedGuests: number;
  adults: number;
  extraGuestPrice: number;
  nights: number;
}): { extraGuestCount: number; extraGuestCharges: number } {
  if (!params.allowExtraGuests || params.nights <= 0) {
    return { extraGuestCount: 0, extraGuestCharges: 0 };
  }
  const extraGuestCount = Math.max(0, params.adults - params.includedGuests);
  const extraGuestCharges = roundMoney(
    extraGuestCount * Math.max(0, params.extraGuestPrice) * params.nights
  );
  return { extraGuestCount, extraGuestCharges };
}

export function computeBookingQuote(input: BookingQuoteInput): BookingQuote | null {
  const nights = nightsBetweenYmd(input.checkInYmd, input.checkOutYmd);
  if (nights <= 0) return null;

  const hostNightlyRate = Math.max(0, Number(input.hostNightlyRate) || 0);
  const feePercent = input.feePercent ?? getPlatformFeePercent();
  const totalRent = roundMoney(hostNightlyRate * nights);
  const platformFee = roundMoney(totalRent * (feePercent / 100));

  const adults = Math.max(1, Number(input.adults) || 1);
  const kids = Math.max(0, Number(input.kids) || 0);
  const pets = Math.max(0, Number(input.pets) || 0);
  const includedGuests = Math.max(1, Number(input.includedGuests) || 1);

  const { extraGuestCount, extraGuestCharges } = computeExtraGuestCharges({
    allowExtraGuests: input.allowExtraGuests === true,
    includedGuests,
    adults,
    extraGuestPrice: Number(input.extraGuestPrice) || 0,
    nights,
  });

  const wellnessLineItems = (input.wellnessLineItems ?? []).map((line) => ({
    ...line,
    price: Math.max(0, Number(line.price) || 0),
  }));
  const wellnessTotal = roundMoney(
    wellnessLineItems.reduce((sum, line) => sum + line.price, 0)
  );

  const taxableAmount = roundMoney(
    totalRent + platformFee + wellnessTotal + extraGuestCharges
  );
  const salesTax = roundMoney(taxableAmount * (SALES_TAX_PERCENT / 100));
  const touristTax = roundMoney(taxableAmount * (TOURIST_DEVELOPMENT_TAX_PERCENT / 100));
  const cleaningFee = roundMoney(Math.max(0, Number(input.hostCleaningFee) || 0));

  const subtotalBeforeCard = roundMoney(
    taxableAmount + salesTax + touristTax + cleaningFee
  );
  const cardFee = input.applyCardFee
    ? roundMoney(subtotalBeforeCard * (PAYPAL_CARD_FEE_PERCENT / 100))
    : 0;
  const grandTotal = roundMoney(subtotalBeforeCard + cardFee);
  const refundableDeposit = roundMoney(Math.max(0, Number(input.refundableDeposit) || 0));

  return {
    nights,
    hostNightlyRate,
    totalRent,
    platformFee,
    platformFeePercent: feePercent,
    extraGuestCount,
    extraGuestCharges,
    wellnessLineItems,
    wellnessTotal,
    taxableAmount,
    salesTax,
    salesTaxPercent: SALES_TAX_PERCENT,
    touristTax,
    touristTaxPercent: TOURIST_DEVELOPMENT_TAX_PERCENT,
    cleaningFee,
    cardFee,
    cardFeePercent: PAYPAL_CARD_FEE_PERCENT,
    grandTotal,
    refundableDeposit,
    adults,
    kids,
    pets,
  };
}

/** Resolve host nightly rate from property price or selected units. */
export function resolveHostNightlyRate(
  propertyNightlyPrice: number,
  selectedUnits: Array<{ price?: unknown }> | null | undefined
): number {
  if (selectedUnits && selectedUnits.length > 0) {
    return selectedUnits.reduce((sum, u) => sum + (Number(u?.price) || 0), 0);
  }
  return Math.max(0, Number(propertyNightlyPrice) || 0);
}

export function buildBookingQuoteFromProperty(params: {
  property: {
    price: number;
    cleaning_fee?: number | null;
    cleaningFee?: number | null;
    guests?: number | null;
    allow_extra_guests?: boolean | null;
    extra_guest_price?: number | null;
    refundable_deposit?: number | null;
  };
  checkInYmd: string;
  checkOutYmd: string;
  selectedUnits?: Array<{ price?: unknown }> | null;
  adults: number;
  kids?: number;
  pets?: number;
  wellnessLineItems?: WellnessQuoteLine[];
  applyCardFee?: boolean;
}): BookingQuote | null {
  const cleaning =
    params.property.cleaning_fee != null
      ? Number(params.property.cleaning_fee)
      : params.property.cleaningFee != null
        ? Number(params.property.cleaningFee)
        : 0;

  return computeBookingQuote({
    checkInYmd: params.checkInYmd,
    checkOutYmd: params.checkOutYmd,
    hostNightlyRate: resolveHostNightlyRate(params.property.price, params.selectedUnits),
    hostCleaningFee: cleaning,
    refundableDeposit:
      params.property.refundable_deposit != null
        ? Number(params.property.refundable_deposit)
        : 0,
    allowExtraGuests: params.property.allow_extra_guests === true,
    extraGuestPrice:
      params.property.extra_guest_price != null
        ? Number(params.property.extra_guest_price)
        : 0,
    includedGuests: Number(params.property.guests) || 1,
    adults: params.adults,
    kids: params.kids,
    pets: params.pets,
    wellnessLineItems: params.wellnessLineItems,
    applyCardFee: params.applyCardFee,
  });
}
