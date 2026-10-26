/**
 * Public listing location privacy: area + city text and jittered approximate map center.
 */
import { cityLabelFromPropertyLocation } from '@/lib/propertyLocationCity';

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
 * Guest-facing location: neighborhood/city + state. Never street, ZIP, or country.
 * "11861 NW 4th St, Plantation, FL 33325, USA" → "Plantation, FL"
 * "121 NE 5th St, Miami, FL 33132, USA" → "Miami, FL"
 * "Wynwood, Miami, FL, USA" → "Wynwood, Miami, FL"
 */
export function formatPublicLocation(location: string | null | undefined): string {
  if (!location) return '';
  const parts = location
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';

  while (
    parts.length > 0 &&
    /^(USA|United States(\s+of\s+America)?|US)$/i.test(parts[parts.length - 1])
  ) {
    parts.pop();
  }

  if (parts.length > 0) {
    const last = parts[parts.length - 1];
    const stateZip = last.match(/^([A-Z]{2})(\s+\d{5}(-\d{4})?)?$/i);
    if (stateZip) parts[parts.length - 1] = stateZip[1].toUpperCase();
  }

  while (parts.length > 0 && /^\d/.test(parts[0])) {
    parts.shift();
  }

  const joined = parts.join(', ');
  if (joined) return joined;
  return cityLabelFromPropertyLocation(location);
}

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Replace a stored street address inside host-written listing copy. */
export function replaceExactAddressInPublicText(
  text: string,
  exactLocation: string | null | undefined
): string {
  const exact = String(exactLocation || '').trim();
  const pub = formatPublicLocation(exact);
  if (!text || !exact || !pub || exact.toLowerCase() === pub.toLowerCase()) return text;
  const escaped = exact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let next = text.replace(new RegExp(escaped, 'gi'), pub);
  const street = exact.split(',')[0]?.trim() || '';
  if (street.length >= 8 && /^\d/.test(street) && next.includes(street)) {
    next = next.split(street).join(pub);
  }
  return next;
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

/** Exact street address only after a confirmed booking (or for host/admin). */
export function travelerLocationLabel(
  location: string | null | undefined,
  opts?: { bookingStatus?: string | null; isHost?: boolean; isAdmin?: boolean }
): string {
  if (canViewExactLocation(opts || {})) {
    return String(location || '').trim();
  }
  return formatPublicLocation(location);
}
