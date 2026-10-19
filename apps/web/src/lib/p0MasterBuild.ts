/** P0 master-build policy from the 2026-10-19 founder brief. */

/** Instant Book is out of P0. Every stay is Request-to-Book. */
export const REQUEST_TO_BOOK_ONLY = true;

/** Card processing (2.99% + $0.49) is a platform cost, never added to the guest total. */
export function guestPaysCardProcessingFee(): boolean {
  return false;
}

export function listingAllowsDirectBooking(flag?: boolean | null): boolean {
  if (REQUEST_TO_BOOK_ONLY) return false;
  return flag === true;
}
