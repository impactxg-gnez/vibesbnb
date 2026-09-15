/** In-app path for the guest PayPal checkout for an accepted booking. */
export function bookingPayPath(bookingId: string): string {
  return `/bookings/pay/${encodeURIComponent(bookingId)}`;
}

export function bookingPayUrl(appUrl: string, bookingId: string): string {
  return `${appUrl.replace(/\/$/, '')}${bookingPayPath(bookingId)}`;
}
