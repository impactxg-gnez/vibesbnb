/** True when the listing includes a Balcony amenity (case-insensitive / partial). */
export function propertyHasBalcony(amenities: unknown): boolean {
  if (!Array.isArray(amenities)) return false;
  return amenities.some((a) => {
    const s = String(a ?? '').trim().toLowerCase();
    return s === 'balcony' || s.includes('balcony');
  });
}

/** Add or remove the canonical `Balcony` amenity while preserving other amenities. */
export function setBalconyAmenity(amenities: string[] | unknown, hasBalcony: boolean): string[] {
  const list = Array.isArray(amenities)
    ? amenities.map((a) => String(a ?? '').trim()).filter(Boolean)
    : [];
  const without = list.filter((a) => !a.toLowerCase().includes('balcony'));
  return hasBalcony ? [...without, 'Balcony'] : without;
}
