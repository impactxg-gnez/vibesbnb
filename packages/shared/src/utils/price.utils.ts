import { PLATFORM_FEE_PERCENT, TAX_RATE_PERCENT } from '../constants';
import { PriceBreakdown } from '../types/booking.types';
import { getDaysBetween } from './date.utils';

export function calculateBookingPrice(
  checkIn: Date,
  checkOut: Date,
  basePrice: number,
  cleaningFee: number,
  nightlyOverrides: Map<string, number> = new Map()
): PriceBreakdown {
  const nights = getDaysBetween(checkIn, checkOut);
  
  const nightlyRates: Array<{ date: Date; price: number }> = [];
  let subtotal = 0;

  const current = new Date(checkIn);
  for (let i = 0; i < nights; i++) {
    const dateKey = current.toISOString().split('T')[0];
    const price = nightlyOverrides.get(dateKey) || basePrice;
    nightlyRates.push({ date: new Date(current), price });
    subtotal += price;
    current.setDate(current.getDate() + 1);
  }

  const serviceFee = Math.round(subtotal * (PLATFORM_FEE_PERCENT / 100));
  const taxes = Math.round((subtotal + cleaningFee + serviceFee) * (TAX_RATE_PERCENT / 100));
  const total = subtotal + cleaningFee + serviceFee + taxes;

  return {
    nights,
    basePrice,
    subtotal,
    cleaningFee,
    serviceFee,
    taxes,
    total,
    currency: 'USD',
    nightlyRates,
  };
}

export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

export function calculateRefundAmount(
  totalPaid: number,
  daysUntilCheckIn: number,
  cancellationPolicy: 'flexible' | 'moderate' | 'strict' | 'super_strict'
): number {
  const policies = {
    flexible: [{ days: 1, percent: 100 }],
    moderate: [{ days: 5, percent: 100 }, { days: 0, percent: 50 }],
    strict: [{ days: 7, percent: 50 }],
    super_strict: [],
  };

  const policyRules = policies[cancellationPolicy];
  let refundPercent = 0;

  for (const rule of policyRules) {
    if (daysUntilCheckIn >= rule.days) {
      refundPercent = rule.percent;
      break;
    }
  }

  return Math.round(totalPaid * (refundPercent / 100));
}


