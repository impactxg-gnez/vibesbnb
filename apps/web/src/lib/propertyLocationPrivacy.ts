/**
 * Public listing location privacy: area + city text and jittered approximate map center.
 */

const EARTH_RADIUS_M = 6_371_000;

/** Public map circle radius (~450m) — not the true pin. */
export const PUBLIC_MAP_APPROX_RADIUS_METERS = 450;

/** Deterministic jitter distance so the true pin is not recoverable from the circle center. */
const JITTER_METERS = 180;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function offsetLatLng(lat: number, lng: number, distanceM: number, bearingDeg: number) {
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const ang = distanceM / EARTH_RADIUS_M;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2)
    );
  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lng2 * 180) / Math.PI,
  };
}

/**
 * Guest-facing location: last two comma parts (area, city / region).
 * Never show street number when more parts exist.
 */
export function formatPublicLocation(location: string | null | undefined): string {
  if (!location) return '';
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');
  return parts.slice(-2).join(', ');
}

/** Jittered center for public map — stable per propertyId. */
export function approximateMapCenter(
  lat: number,
  lng: number,
  propertyId: string
): { latitude: number; longitude: number } {
  const h = hashString(propertyId || `${lat},${lng}`);
  const bearing = h % 360;
  const dist = JITTER_METERS + (h % 40);
  return offsetLatLng(lat, lng, dist, bearing);
}

const BOOKED_EXACT_STATUSES = new Set([
  'accepted',
  'confirmed',
  'checked_in',
  'checked_out',
  'completed',
]);

export function canViewExactLocation(opts: {
  isHost?: boolean;
  isAdmin?: boolean;
  bookingStatus?: string | null;
}): boolean {
  if (opts.isHost || opts.isAdmin) return true;
  const s = String(opts.bookingStatus || '').toLowerCase();
  return BOOKED_EXACT_STATUSES.has(s);
}
