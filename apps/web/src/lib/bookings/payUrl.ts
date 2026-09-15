import { createBookingPayClaim } from '@/lib/bookings/payClaim';

/** In-app path for the guest PayPal checkout for an accepted booking. */
export function bookingPayPath(bookingId: string, claim?: string | null): string {
  const path = `/bookings/pay/${encodeURIComponent(bookingId)}`;
  if (!claim) return path;
  return `${path}?claim=${encodeURIComponent(claim)}`;
}

export function bookingPayUrl(
  appUrl: string,
  bookingId: string,
  userId?: string | null
): string {
  const claim = userId ? createBookingPayClaim(bookingId, userId) : null;
  return `${appUrl.replace(/\/$/, '')}${bookingPayPath(bookingId, claim)}`;
}
