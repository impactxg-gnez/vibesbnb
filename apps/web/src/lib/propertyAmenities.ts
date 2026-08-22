import { canonicalizeAmenity, isCatalogAmenity } from '@/lib/propertyAmenityCatalog';

const BALCONY_CANONICAL = 'Patio or balcony';

function isBalconyLabel(value: string): boolean {
  const s = value.trim().toLowerCase();
  return s === 'balcony' || s === BALCONY_CANONICAL.toLowerCase() || s.includes('balcony');
}

/** True when the listing includes a balcony / patio amenity. */
export function propertyHasBalcony(amenities: unknown): boolean {
  if (!Array.isArray(amenities)) return false;
  return amenities.some((a) => isBalconyLabel(String(a ?? '')));
}

/** Add or remove the canonical patio/balcony amenity while preserving other amenities. */
export function setBalconyAmenity(amenities: string[] | unknown, hasBalcony: boolean): string[] {
  const list = Array.isArray(amenities)
    ? amenities.map((a) => String(a ?? '').trim()).filter(Boolean)
    : [];
  const without = list.filter((a) => !isBalconyLabel(a));
  return hasBalcony ? [...without, BALCONY_CANONICAL] : without;
}

/** Normalize a scraped amenity label to catalog string(s). */
export function normalizeScrapedAmenityLabel(raw: string): string[] {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return [];

  const canonical = canonicalizeAmenity(trimmed);
  if (canonical) return [canonical];

  if (isCatalogAmenity(trimmed)) return [trimmed];

  return [trimmed];
}
