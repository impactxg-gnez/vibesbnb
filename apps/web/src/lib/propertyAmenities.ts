/** True when the listing includes a Balcony amenity (case-insensitive). */
export function propertyHasBalcony(amenities: unknown): boolean {
  if (!Array.isArray(amenities)) return false;
  return amenities.some((a) => String(a ?? '').trim().toLowerCase() === 'balcony');
}
