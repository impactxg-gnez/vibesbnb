/**
 * Property type chips from Filters / SearchSection / URL `categories`.
 * Matching uses listing `type` plus title/name for hosts who enter free text.
 */

import { canonicalizeAmenity } from '@/lib/propertyAmenityCatalog';

const ROOM_RENTAL_RE =
  /private\s*rooms?|shared\s*room|room\s*inside|room\s+in\s+(a\s+)?(property|house|apartment|home|condo)|\broom\s+only\b/i;

function haystack(listingType: string | undefined, title: string | undefined, name: string | undefined): string {
  return `${listingType || ''} ${title || ''} ${name || ''}`.toLowerCase();
}

/** One selected chip — true if this listing qualifies as that type */
export function listingMatchesPropertyTypeChip(
  listingType: string | undefined,
  title: string | undefined,
  name: string | undefined,
  chip: string
): boolean {
  const h = haystack(listingType, title, name);
  const t = (listingType || '').trim().toLowerCase();
  const c = chip.trim();

  if (c === 'Entire House' || c === 'House') {
    if (ROOM_RENTAL_RE.test(h)) return false;
    if (
      /\b(house|villa|bungalow|townhouse|chalet|cabin|castle|estate)\b/.test(h) ||
      /\bentire\s+(place|home|house|unit)\b/.test(h) ||
      /\bwhole\s+(home|house|place)\b/.test(h) ||
      /\b(detached|single[-\s]?family)\b/.test(h)
    ) {
      return true;
    }
    if (t === 'property' && !ROOM_RENTAL_RE.test(h) && !/\b(room|studio only)\b/i.test(h)) {
      return true;
    }
    return false;
  }

  if (c === 'Apartment') {
    return /\b(apartment|flat|loft|penthouse|studio)\b/.test(h);
  }

  if (c === 'Condo') {
    return /\b(condo|condominium)\b/.test(h);
  }

  if (c === 'Private Room' || c === 'Private Rooms' || c === 'Room inside property') {
    return (
      ROOM_RENTAL_RE.test(h) ||
      /\bprivate\s*rooms?\b/.test(h) ||
      /\bshared\s*room\b/.test(h) ||
      /\broom\s*inside\b/.test(h)
    );
  }

  return h.includes(c.toLowerCase());
}

/** Any-of matching when multiple property types are selected */
export function listingMatchesAnyPropertyTypeChip(
  listingType: string | undefined,
  title: string | undefined,
  name: string | undefined,
  chips: string[]
): boolean {
  if (!chips.length) return true;
  return chips.some((chip) => listingMatchesPropertyTypeChip(listingType, title, name, chip));
}

/** Header / host-profile quick filters (`1-bed`, `2-bed`, `studios`, `condo`). */
export type HeaderPropertyCategory = '1-bed' | '2-bed' | 'studios' | 'condo';

export const HEADER_PROPERTY_CATEGORIES: { id: HeaderPropertyCategory; label: string }[] = [
  { id: '1-bed', label: '1 Bed' },
  { id: '2-bed', label: '2 Bed' },
  { id: 'studios', label: 'Studios' },
  { id: 'condo', label: 'Condos' },
];

function effectiveBedroomCount(bedrooms?: number, beds?: number): number {
  if (typeof bedrooms === 'number' && bedrooms > 0) return bedrooms;
  if (typeof beds === 'number' && beds > 0) return beds;
  return 0;
}

/** Match a listing against a header-style category chip (bed count, studio, condo). */
export function listingMatchesHeaderCategory(
  listing: {
    type?: string;
    title?: string;
    name?: string;
    bedrooms?: number;
    beds?: number;
  },
  category: string | null | undefined
): boolean {
  if (!category) return true;
  const c = category.trim().toLowerCase() as HeaderPropertyCategory;
  const h = haystack(listing.type, listing.title, listing.name);
  const bedCount = effectiveBedroomCount(listing.bedrooms, listing.beds);

  if (c === '1-bed') return bedCount === 1;
  if (c === '2-bed') return bedCount === 2;
  if (c === 'studios') return /\bstudio\b/.test(h);
  if (c === 'condo') {
    return listingMatchesPropertyTypeChip(listing.type, listing.title, listing.name, 'Condo');
  }
  return true;
}

/** Host-provided amenity strings vs filter chips — alias-aware for catalog labels */
export function listingHasAllAmenityChips(
  listingAmenities: string[] | undefined,
  required: string[]
): boolean {
  if (!required.length) return true;
  const list = (listingAmenities || []).map((a) => String(a).trim()).filter(Boolean);
  const listLower = list.map((a) => a.toLowerCase());

  return required.every((req) => {
    const chip = req.trim();
    const chipLower = chip.toLowerCase();

    if (chipLower === 'washer/dryer') {
      return (
        listLower.includes('washer/dryer') ||
        (listLower.includes('washer') && listLower.includes('dryer'))
      );
    }

    const chipCanonical = canonicalizeAmenity(chip)?.toLowerCase();
    if (chipCanonical) {
      return list.some((la) => {
        const laCanonical = canonicalizeAmenity(la)?.toLowerCase();
        return laCanonical === chipCanonical || la.toLowerCase() === chipCanonical;
      });
    }

    return listLower.includes(chipLower);
  });
}
