import { PLATFORM_FEE_PERCENT } from '@vibesbnb/shared';

/** Platform fee % (client may override via admin localStorage). */
export function getPlatformFeePercent(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('serviceFee');
    if (saved != null) {
      const n = Number(saved);
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
    }
  }
  return PLATFORM_FEE_PERCENT;
}

/** Host-listed amount → guest-facing price with platform fee baked in. */
export function toTravelerPrice(
  hostAmount: number,
  feePercent: number = PLATFORM_FEE_PERCENT
): number {
  if (!Number.isFinite(hostAmount) || hostAmount <= 0) return 0;
  return hostAmount + Math.round(hostAmount * (feePercent / 100));
}

export function computeHostLodgingSubtotal(params: {
  hostNightlyRate: number;
  nights: number;
  hostCleaningFee: number;
}): number {
  return params.hostNightlyRate * params.nights + params.hostCleaningFee;
}

/** Lodging totals: host payout subtotal, platform fee, and guest total (fee included, not shown separately). */
export function computeLodgingWithBakedFee(params: {
  hostNightlyRate: number;
  nights: number;
  hostCleaningFee: number;
  feePercent?: number;
}): {
  hostSubtotal: number;
  platformFee: number;
  travelerLodgingTotal: number;
  travelerNightlyRate: number;
  travelerCleaningFee: number;
  travelerAccommodationSubtotal: number;
} {
  const feePercent = params.feePercent ?? PLATFORM_FEE_PERCENT;
  const hostAccommodation = params.hostNightlyRate * params.nights;
  const hostSubtotal = hostAccommodation + params.hostCleaningFee;
  const platformFee = Math.round(hostSubtotal * (feePercent / 100));
  const travelerLodgingTotal = hostSubtotal + platformFee;
  const travelerNightlyRate = toTravelerPrice(params.hostNightlyRate, feePercent);
  const travelerCleaningFee = toTravelerPrice(params.hostCleaningFee, feePercent);
  const travelerAccommodationSubtotal = toTravelerPrice(hostAccommodation, feePercent);

  return {
    hostSubtotal,
    platformFee,
    travelerLodgingTotal,
    travelerNightlyRate,
    travelerCleaningFee,
    travelerAccommodationSubtotal,
  };
}
