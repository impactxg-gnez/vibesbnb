import {
  PAYPAL_CARD_FEE_PERCENT,
  SALES_TAX_PERCENT,
  TOURIST_DEVELOPMENT_TAX_PERCENT,
  PLATFORM_FEE_PERCENT,
} from '@/src/constants/pricing';
import { getCachedPlatformFees } from './platformFees';

function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function nightsBetweenYmd(checkIn: string, checkOut: string): number {
  const parse = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d);
  };
  const t1 = parse(checkIn);
  const t2 = parse(checkOut);
  if (t1 == null || t2 == null) return 0;
  const days = Math.round((t2 - t1) / 86400000);
  return days > 0 ? days : 0;
}

export type BookingQuote = {
  nights: number;
  grandTotal: number;
  totalRent: number;
  platformFee: number;
  cleaningFee: number;
};

export function computeBookingQuote(params: {
  checkInYmd: string;
  checkOutYmd: string;
  nightlyRate: number;
  cleaningFee?: number;
  adults?: number;
  includedGuests?: number;
  allowExtraGuests?: boolean;
  extraGuestPrice?: number;
  applyCardFee?: boolean;
}): BookingQuote | null {
  const nights = nightsBetweenYmd(params.checkInYmd, params.checkOutYmd);
  if (nights <= 0) return null;

  const feePercent = getCachedPlatformFees()?.service ?? PLATFORM_FEE_PERCENT;
  const nightlyRate = Math.max(0, Number(params.nightlyRate) || 0);
  const totalRent = roundMoney(nightlyRate * nights);
  const platformFee = roundMoney(totalRent * (feePercent / 100));

  const adults = Math.max(1, Number(params.adults) || 1);
  const includedGuests = Math.max(1, Number(params.includedGuests) || 1);
  let extraGuestCharges = 0;
  if (params.allowExtraGuests) {
    const extra = Math.max(0, adults - includedGuests);
    extraGuestCharges = roundMoney(extra * (Number(params.extraGuestPrice) || 0) * nights);
  }

  const taxable = roundMoney(totalRent + platformFee + extraGuestCharges);
  const salesTax = roundMoney(taxable * (SALES_TAX_PERCENT / 100));
  const touristTax = roundMoney(taxable * (TOURIST_DEVELOPMENT_TAX_PERCENT / 100));
  const cleaningFee = roundMoney(Math.max(0, Number(params.cleaningFee) || 0));

  let subtotal = roundMoney(taxable + salesTax + touristTax + cleaningFee);
  if (params.applyCardFee) {
    subtotal = roundMoney(subtotal + subtotal * (PAYPAL_CARD_FEE_PERCENT / 100));
  }

  return {
    nights,
    totalRent,
    platformFee,
    cleaningFee,
    grandTotal: subtotal,
  };
}
