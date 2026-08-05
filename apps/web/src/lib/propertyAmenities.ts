/** True when the listing includes a Balcony amenity (case-insensitive / partial). */
export function propertyHasBalcony(amenities: unknown): boolean {
  if (!Array.isArray(amenities)) return false;
  return amenities.some((a) => {
    const s = String(a ?? '').trim().toLowerCase();
    return s === 'balcony' || s.includes('balcony');
  });
}
