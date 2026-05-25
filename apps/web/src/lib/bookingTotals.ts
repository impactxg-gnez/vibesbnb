import { nightsBetweenYmd } from '@/lib/dateUtils';
import { computeLodgingWithBakedFee } from '@/lib/platformPricing';

export function computeBookingGrandTotal(params: {
  propertyNightlyPrice: number;
  cleaningFee: number;
  checkInYmd: string;
  checkOutYmd: string;
  selectedUnits: Array<{ price?: unknown }> | null | undefined;
  wellnessLineItems: Array<{ price: number }>;
}): { stayNights: number; grandTotal: number } {
  const stayNights = nightsBetweenYmd(params.checkInYmd, params.checkOutYmd);
  let hostNightlyRate = params.propertyNightlyPrice;
  if (params.selectedUnits && params.selectedUnits.length > 0) {
    hostNightlyRate = params.selectedUnits.reduce(
      (sum, u) => sum + (Number(u?.price) || 0),
      0
    );
  }
  const { travelerLodgingTotal } = computeLodgingWithBakedFee({
    hostNightlyRate,
    nights: stayNights,
    hostCleaningFee: params.cleaningFee,
  });
  const wellnessSuppliesTotal = params.wellnessLineItems.reduce(
    (s, i) => s + (Number(i.price) || 0),
    0
  );
  return { stayNights, grandTotal: travelerLodgingTotal + wellnessSuppliesTotal };
}

export function totalsMatchCents(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}
