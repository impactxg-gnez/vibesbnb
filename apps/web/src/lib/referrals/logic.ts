import { referralAffiliateConfig as config } from './config';

/** Money helper. Program amounts come from config.ts, never from literals here. */
export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export type CreditLot = {
  id: string;
  amount: number;
  usedAmount: number;
  expiresAt: string;
  status: string;
};

export type ServiceFeeAdjustment = {
  enabled: boolean;
  friendDiscount: number;
  creditsApplied: number;
  creditsRemaining: number;
  serviceFeeAfter: number;
  guestDue: number;
  rent: number;
  cleaningFee: number;
  /** True only when referral credits were applied. */
  showCreditLine: boolean;
};

/**
 * Credits and the new-guest offer reduce the guest service fee only.
 * Rent, cleaning, and taxes are not inputs to the discount.
 * The amount taken cannot exceed the service fee or the amount that would
 * push the guest total below zero.
 */
export function applyServiceFeeAdjustment(params: {
  enabled: boolean;
  serviceFee: number;
  grandTotal: number;
  rent: number;
  cleaningFee: number;
  friendEligible: boolean;
  creditBalance: number;
}): ServiceFeeAdjustment {
  const serviceFee = roundMoney(Math.max(0, params.serviceFee));
  const grandTotal = roundMoney(Math.max(0, params.grandTotal));
  const rent = roundMoney(Math.max(0, params.rent));
  const cleaningFee = roundMoney(Math.max(0, params.cleaningFee));
  const creditBalance = roundMoney(Math.max(0, params.creditBalance));

  if (!params.enabled) {
    return {
      enabled: false,
      friendDiscount: 0,
      creditsApplied: 0,
      creditsRemaining: creditBalance,
      serviceFeeAfter: serviceFee,
      guestDue: grandTotal,
      rent,
      cleaningFee,
      showCreditLine: false,
    };
  }

  const room = roundMoney(Math.min(serviceFee, grandTotal));
  const friendDiscount = params.friendEligible
    ? roundMoney(Math.min(config.friendServiceFeeDiscountUsd, room))
    : 0;
  const roomAfterFriend = roundMoney(Math.max(0, room - friendDiscount));
  const creditsApplied = roundMoney(Math.min(creditBalance, roomAfterFriend));
  const serviceFeeAfter = roundMoney(Math.max(0, serviceFee - friendDiscount - creditsApplied));
  const guestDue = roundMoney(Math.max(0, grandTotal - friendDiscount - creditsApplied));

  return {
    enabled: true,
    friendDiscount,
    creditsApplied,
    creditsRemaining: roundMoney(creditBalance - creditsApplied),
    serviceFeeAfter,
    guestDue,
    rent,
    cleaningFee,
    showCreditLine: creditsApplied > 0,
  };
}

export function availableCreditBalance(lots: CreditLot[], now: Date): number {
  return roundMoney(
    openLots(lots, now).reduce((sum, lot) => sum + (lot.amount - lot.usedAmount), 0)
  );
}

function openLots(lots: CreditLot[], now: Date): CreditLot[] {
  const t = now.getTime();
  return lots.filter((lot) => {
    if (lot.status !== 'available') return false;
    if (!(new Date(lot.expiresAt).getTime() > t)) return false;
    return lot.amount - lot.usedAmount > 0.001;
  });
}

/** Oldest expiry first. Ties break by id so the order is stable. */
export function applyCreditsFifo(
  lots: CreditLot[],
  requested: number,
  now: Date
): { applied: number; lots: CreditLot[] } {
  const next = lots.map((lot) => ({ ...lot }));
  let need = roundMoney(Math.max(0, requested));
  const order = openLots(next, now).sort(
    (a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.id.localeCompare(b.id)
  );
  let applied = 0;
  for (const lot of order) {
    if (need <= 0) break;
    const avail = roundMoney(lot.amount - lot.usedAmount);
    const take = roundMoney(Math.min(avail, need));
    lot.usedAmount = roundMoney(lot.usedAmount + take);
    if (lot.usedAmount >= lot.amount - 0.001) lot.status = 'used';
    applied = roundMoney(applied + take);
    need = roundMoney(need - take);
  }
  return { applied, lots: next };
}

/** Put credits back onto the lots that were used most recently (reverse FIFO). */
export function restoreCreditsFifo(
  lots: CreditLot[],
  amount: number,
  now: Date
): CreditLot[] {
  const next = lots.map((lot) => ({ ...lot }));
  let left = roundMoney(Math.max(0, amount));
  const order = next
    .filter((lot) => (lot.status === 'available' || lot.status === 'used') && lot.usedAmount > 0)
    .filter((lot) => new Date(lot.expiresAt).getTime() > now.getTime())
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt) || b.id.localeCompare(a.id));
  for (const lot of order) {
    if (left <= 0) break;
    const give = roundMoney(Math.min(lot.usedAmount, left));
    lot.usedAmount = roundMoney(lot.usedAmount - give);
    if (lot.usedAmount <= 0.001) {
      lot.usedAmount = 0;
      lot.status = 'available';
    } else if (lot.status === 'used') {
      lot.status = 'available';
    }
    left = roundMoney(left - give);
  }
  return next;
}

export function addMonthsUtc(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function creditExpiresAt(issuedAt: Date): string {
  return addMonthsUtc(issuedAt, config.creditExpiryMonths).toISOString();
}

export function rewardCreditsForCompletedStay(params: {
  cancelledOrRefunded: boolean;
  checkoutPassed: boolean;
  alreadyRewarded: boolean;
  paid: boolean;
}): number {
  if (!params.paid || params.cancelledOrRefunded || !params.checkoutPassed || params.alreadyRewarded) {
    return 0;
  }
  return config.referralRewardCredits;
}

export function commissionForRent(rent: number): number {
  const base = roundMoney(Math.max(0, rent));
  if (base <= 0) return 0;
  const raw = roundMoney(base * config.affiliateCommissionRate);
  return roundMoney(Math.min(config.affiliateCommissionCapUsd, raw));
}

export function withinTrackingWindow(clickedAt: Date, bookedAt: Date): boolean {
  const delta = bookedAt.getTime() - clickedAt.getTime();
  const windowMs = config.affiliateTrackingWindowDays * 24 * 60 * 60 * 1000;
  return delta >= 0 && delta <= windowMs;
}

export function attributeLastClick(
  clicks: Array<{ affiliateId: string; clickedAt: Date }>,
  bookedAt: Date
): string | null {
  const valid = clicks.filter((click) => withinTrackingWindow(click.clickedAt, bookedAt));
  if (valid.length === 0) return null;
  valid.sort((a, b) => b.clickedAt.getTime() - a.clickedAt.getTime());
  return valid[0].affiliateId;
}

export function affiliateCommissionForBooking(params: {
  rent: number;
  clickedAt: Date | null;
  bookedAt: Date;
  selfBooking: boolean;
  cancelledOrRefunded: boolean;
  checkoutPassed: boolean;
}): number {
  if (params.selfBooking || params.cancelledOrRefunded || !params.checkoutPassed) return 0;
  if (!params.clickedAt || !withinTrackingWindow(params.clickedAt, params.bookedAt)) return 0;
  return commissionForRent(params.rent);
}

export function checkoutDatePassed(checkOut: string, now: Date): boolean {
  const day = String(checkOut || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return day < now.toISOString().slice(0, 10);
}

export function isCancelledOrRefunded(status: string, paymentStatus: string): boolean {
  const s = status.toLowerCase();
  const p = paymentStatus.toLowerCase();
  return s === 'cancelled' || s === 'rejected' || s === 'refunded' || p === 'refunded';
}

export function payoutPeriod(iso: string): string {
  return String(iso).slice(0, 7);
}

export function canOpenPayout(unpaidCommission: number): boolean {
  return roundMoney(unpaidCommission) + 0.001 >= config.affiliateMinimumPayoutUsd;
}

export function normalizeCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}

export function normalizeEmail(raw: string | null | undefined): string {
  return String(raw || '').trim().toLowerCase();
}
