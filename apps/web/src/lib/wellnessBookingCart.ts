/**
 * Persist wellness supply cart from listing PDP → checkout (`/bookings/new`) via sessionStorage.
 */

export type WellnessBookingLineItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string | null;
};

const PREFIX = 'vibesbnb_wellness_cart_';

export function wellnessCartStorageKey(propertyId: string): string {
  return `${PREFIX}${propertyId}`;
}

export function saveWellnessCartForBooking(
  propertyId: string,
  items: WellnessBookingLineItem[]
): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      wellnessCartStorageKey(propertyId),
      JSON.stringify(items)
    );
  } catch {
    /* quota / private mode */
  }
}

export function loadWellnessCartForBooking(propertyId: string): WellnessBookingLineItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(wellnessCartStorageKey(propertyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row: unknown) =>
          row &&
          typeof row === 'object' &&
          typeof (row as WellnessBookingLineItem).id === 'string' &&
          typeof (row as WellnessBookingLineItem).name === 'string' &&
          typeof (row as WellnessBookingLineItem).price === 'number'
      )
      .map((row: WellnessBookingLineItem) => ({
        id: row.id,
        name: row.name,
        category: typeof row.category === 'string' ? row.category : '',
        price: Math.max(0, Number(row.price) || 0),
        image: row.image ?? null,
      }));
  } catch {
    return [];
  }
}

export function clearWellnessCartForBooking(propertyId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(wellnessCartStorageKey(propertyId));
  } catch {
    /* ignore */
  }
}

export function wellnessCartSum(items: WellnessBookingLineItem[]): number {
  return items.reduce((s, i) => s + (Number(i.price) || 0), 0);
}
