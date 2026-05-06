import { nightsBetweenYmd } from '@/lib/dateUtils';

export function computeBookingGrandTotal(params: {
  propertyNightlyPrice: number;
  cleaningFee: number;
  checkInYmd: string;
  checkOutYmd: string;
  selectedUnits: Array<{ price?: unknown }> | null | undefined;
  wellnessLineItems: Array<{ price: number }>;
}): { stayNights: number; grandTotal: number } {
  const stayNights = nightsBetweenYmd(params.checkInYmd, params.checkOutYmd);
  let nightlyRate = params.propertyNightlyPrice;
  if (params.selectedUnits && params.selectedUnits.length > 0) {
    nightlyRate = params.selectedUnits.reduce(
      (sum, u) => sum + (Number(u?.price) || 0),
      0
    );
  }
  const cleaning = params.cleaningFee;
  const preService = nightlyRate * stayNights + cleaning;
  const serviceFee = Math.round(preService * 0.1);
  const lodgingTotal = preService + serviceFee;
  const wellnessSuppliesTotal = params.wellnessLineItems.reduce((s, i) => s + (Number(i.price) || 0), 0);
  return { stayNights, grandTotal: lodgingTotal + wellnessSuppliesTotal };
}

export function totalsMatchCents(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}
