/**
 * Occupancy limits for a listing: adults and kids together may not exceed the host's guest
 * count plus the paid extra guests the host allows on top of it.
 */

export type GuestCapacityProperty = {
  guests?: number | null;
  allow_extra_guests?: boolean | null;
  /** Paid extra guests allowed above `guests`; null until the host sets one. */
  max_extra_guests?: number | null;
};

export const MIN_GUEST_CAPACITY = 1;
/** Ceiling for the host-configured extras, matching the DB check constraint. */
export const MAX_EXTRA_GUESTS_ALLOWED = 20;

/** Guests covered by the nightly rate, before any paid extras. */
export function resolveIncludedGuests(
  property: GuestCapacityProperty | null | undefined
): number {
  const guests = Number(property?.guests);
  return Number.isFinite(guests) && guests >= MIN_GUEST_CAPACITY
    ? Math.floor(guests)
    : MIN_GUEST_CAPACITY;
}

export function resolveExtraGuestAllowance(
  property: GuestCapacityProperty | null | undefined
): number {
  if (property?.allow_extra_guests !== true) return 0;
  const extras = Number(property?.max_extra_guests);
  if (!Number.isFinite(extras) || extras <= 0) return 0;
  return Math.min(Math.floor(extras), MAX_EXTRA_GUESTS_ALLOWED);
}

export function resolveGuestCapacity(property: GuestCapacityProperty | null | undefined): number {
  return resolveIncludedGuests(property) + resolveExtraGuestAllowance(property);
}

/** Clamp a party to the listing capacity, trimming kids before adults. */
export function clampPartyToCapacity(
  party: { adults: number; kids: number },
  capacity: number
): { adults: number; kids: number } {
  const adults = Math.min(Math.max(1, Math.floor(party.adults) || 1), capacity);
  const kids = Math.min(Math.max(0, Math.floor(party.kids) || 0), capacity - adults);
  return { adults, kids };
}

export function guestCapacityMessage(capacity: number): string {
  return `This listing takes up to ${capacity} guest${capacity === 1 ? '' : 's'}.`;
}

/** Capacity line for a listing, naming the paid extras when the host allows them. */
export function guestCapacityDetail(
  property: GuestCapacityProperty | null | undefined
): string {
  const included = resolveIncludedGuests(property);
  const extras = resolveExtraGuestAllowance(property);
  if (extras === 0) return guestCapacityMessage(included);
  return `${guestCapacityMessage(included + extras)} The rate covers ${included}; the ${extras} beyond that are charged per night.`;
}
