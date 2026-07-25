/**
 * Persist / restore check-in, check-out, and party size so listing cards and the
 * booking widget share the same stay selection across home → search → property.
 */

export const STAY_SEARCH_STORAGE_KEY = 'vibesbnb_stay_search';
export const STAY_SEARCH_CHANGE_EVENT = 'vibesbnb:stay-search-change';

export type StaySearchParams = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  kids?: number;
  pets?: number;
};

function isYmd(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeStaySearch(input: StaySearchParams): StaySearchParams {
  const checkIn = isYmd(input.checkIn) ? input.checkIn : undefined;
  const checkOut = isYmd(input.checkOut) ? input.checkOut : undefined;
  const guests =
    typeof input.guests === 'number' && Number.isFinite(input.guests) && input.guests > 0
      ? Math.floor(input.guests)
      : undefined;
  const kids =
    typeof input.kids === 'number' && Number.isFinite(input.kids) && input.kids > 0
      ? Math.floor(input.kids)
      : undefined;
  const pets =
    typeof input.pets === 'number' && Number.isFinite(input.pets) && input.pets > 0
      ? Math.floor(input.pets)
      : undefined;
  return { checkIn, checkOut, guests, kids, pets };
}

export function writeStaySearch(input: StaySearchParams): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeStaySearch(input);
    if (!normalized.checkIn && !normalized.checkOut && !normalized.guests) {
      sessionStorage.removeItem(STAY_SEARCH_STORAGE_KEY);
    } else {
      sessionStorage.setItem(STAY_SEARCH_STORAGE_KEY, JSON.stringify(normalized));
    }
    window.dispatchEvent(
      new CustomEvent(STAY_SEARCH_CHANGE_EVENT, { detail: normalized })
    );
  } catch {
    /* private mode / quota */
  }
}

export function readStaySearch(): StaySearchParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STAY_SEARCH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StaySearchParams;
    return normalizeStaySearch(parsed && typeof parsed === 'object' ? parsed : {});
  } catch {
    return {};
  }
}

/** Merge URL query values over sessionStorage (URL wins when present). */
export function resolveStaySearch(fromUrl: StaySearchParams = {}): StaySearchParams {
  const stored = readStaySearch();
  return normalizeStaySearch({
    checkIn: fromUrl.checkIn || stored.checkIn,
    checkOut: fromUrl.checkOut || stored.checkOut,
    guests: fromUrl.guests ?? stored.guests,
    kids: fromUrl.kids ?? stored.kids,
    pets: fromUrl.pets ?? stored.pets,
  });
}

export function staySearchToQuery(stay: StaySearchParams): URLSearchParams {
  const params = new URLSearchParams();
  const normalized = normalizeStaySearch(stay);
  if (normalized.checkIn) params.set('checkIn', normalized.checkIn);
  if (normalized.checkOut) params.set('checkOut', normalized.checkOut);
  if (normalized.guests) params.set('guests', String(normalized.guests));
  if (normalized.kids) params.set('kids', String(normalized.kids));
  if (normalized.pets) params.set('pets', String(normalized.pets));
  return params;
}

export function buildListingHref(listingId: string, stay: StaySearchParams = {}): string {
  const params = staySearchToQuery(stay);
  const qs = params.toString();
  return qs ? `/listings/${listingId}?${qs}` : `/listings/${listingId}`;
}
