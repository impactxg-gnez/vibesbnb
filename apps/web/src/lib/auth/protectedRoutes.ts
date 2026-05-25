/** Routes that require a signed-in user with a verified email (or OAuth). */
export const VERIFIED_EMAIL_REQUIRED_PREFIXES = [
  '/bookings',
  '/profile',
  '/favorites',
  '/messages',
  '/itinerary',
  '/admin',
  '/dispensary',
  '/host/properties',
  '/host/bookings',
  '/host/payouts',
  '/host/messages',
  '/host/application-submitted',
];

/** Paths reachable without a verified email. */
export const AUTH_PUBLIC_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/verify-email',
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/verify-success',
];

export function pathRequiresVerifiedEmail(pathname: string): boolean {
  if (AUTH_PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return VERIFIED_EMAIL_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
