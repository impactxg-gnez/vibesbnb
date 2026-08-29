import { HOST_FEE_PERCENT, PLATFORM_FEE_PERCENT } from '@vibesbnb/shared';

const LS_SERVICE = 'serviceFee';
const LS_HOST = 'hostFee';

let cachedServiceFee: number | null = null;
let cachedHostFee: number | null = null;
let syncPromise: Promise<void> | null = null;

function readLocalFee(key: string, fallback: number): number | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(key);
  if (saved == null) return null;
  const n = Number(saved);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function writeLocalFees(serviceFeePercent: number, hostFeePercent: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_SERVICE, String(serviceFeePercent));
  localStorage.setItem(LS_HOST, String(hostFeePercent));
}

/** Guest-facing service fee % (client cache → localStorage → default). */
export function getPlatformFeePercent(): number {
  if (cachedServiceFee != null) return cachedServiceFee;
  return readLocalFee(LS_SERVICE, PLATFORM_FEE_PERCENT) ?? PLATFORM_FEE_PERCENT;
}

/** Host fee % deducted from payout (client cache → localStorage → default). */
export function getHostFeePercentClient(): number {
  if (cachedHostFee != null) return cachedHostFee;
  return readLocalFee(LS_HOST, HOST_FEE_PERCENT) ?? HOST_FEE_PERCENT;
}

export function setCachedPlatformFees(
  serviceFeePercent: number,
  hostFeePercent: number
): void {
  cachedServiceFee = serviceFeePercent;
  cachedHostFee = hostFeePercent;
  writeLocalFees(serviceFeePercent, hostFeePercent);
}

/** Fetch current platform fees from the server (safe for all visitors). */
export async function syncPlatformFeesFromServer(): Promise<{
  serviceFeePercent: number;
  hostFeePercent: number;
}> {
  if (syncPromise) {
    await syncPromise;
    return {
      serviceFeePercent: getPlatformFeePercent(),
      hostFeePercent: getHostFeePercentClient(),
    };
  }

  syncPromise = (async () => {
    try {
      const res = await fetch('/api/platform-fees', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const service = Number(data.serviceFeePercent);
      const host = Number(data.hostFeePercent);
      if (Number.isFinite(service) && Number.isFinite(host)) {
        setCachedPlatformFees(service, host);
      }
    } catch {
      /* non-blocking */
    } finally {
      syncPromise = null;
    }
  })();

  await syncPromise;
  return {
    serviceFeePercent: getPlatformFeePercent(),
    hostFeePercent: getHostFeePercentClient(),
  };
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
