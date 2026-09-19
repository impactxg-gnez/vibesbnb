import { cityLabelFromPropertyLocation } from '@/lib/propertyLocationCity';
import { formatPublicLocation } from '@/lib/propertyLocationPrivacy';

export const MIAMI_NEIGHBORHOODS = [
  {
    id: 'wynwood',
    slug: 'wynwood',
    name: 'Wynwood',
    match: /\bwynwood\b/i,
  },
  {
    id: 'downtown',
    slug: 'downtown',
    name: 'Downtown Miami',
    match: /\bdowntown(\s+miami)?\b/i,
  },
  {
    id: 'brickell',
    slug: 'brickell',
    name: 'Brickell',
    match: /\bbrickell\b/i,
  },
] as const;

export type MiamiNeighborhoodId = (typeof MIAMI_NEIGHBORHOODS)[number]['id'];

export type ParsedPropertyPlace = {
  publicLocation: string;
  cityLabel: string;
  locality: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  isMiami: boolean;
  neighborhood: MiamiNeighborhoodId | null;
  neighborhoodName: string | null;
};

const STATE_RE = /\b(FL|Florida)\b/i;
const ZIP_RE = /\b(\d{5})(?:-\d{4})?\b/;
const COUNTRY_RE = /\b(USA|United States|United States of America|US)\b/i;

export function neighborhoodBySlug(
  slug: string | null | undefined
): (typeof MIAMI_NEIGHBORHOODS)[number] | null {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  return MIAMI_NEIGHBORHOODS.find((n) => n.slug === key) ?? null;
}

export function detectMiamiNeighborhood(
  location: string | null | undefined
): (typeof MIAMI_NEIGHBORHOODS)[number] | null {
  const raw = String(location || '');
  if (!raw.trim()) return null;
  return MIAMI_NEIGHBORHOODS.find((n) => n.match.test(raw)) ?? null;
}

export function isMiamiLocation(location: string | null | undefined): boolean {
  return /\bmiami\b/i.test(String(location || ''));
}

export function parsePropertyPlace(
  location: string | null | undefined
): ParsedPropertyPlace {
  const raw = String(location || '').trim();
  const publicLocation = formatPublicLocation(raw);
  const cityLabel = cityLabelFromPropertyLocation(raw);
  const neighborhood = detectMiamiNeighborhood(raw);
  const isMiami = isMiamiLocation(raw) || neighborhood != null;

  const zipMatch = raw.match(ZIP_RE);
  const stateMatch = raw.match(STATE_RE);
  const region = stateMatch
    ? stateMatch[1].toUpperCase() === 'FLORIDA'
      ? 'FL'
      : stateMatch[1].toUpperCase()
    : isMiami
      ? 'FL'
      : null;

  let locality: string | null = null;
  if (isMiami) locality = 'Miami';
  else if (cityLabel) {
    locality = cityLabel.replace(/,\s*[A-Z]{2}\s*$/i, '').trim() || cityLabel;
  }

  return {
    publicLocation: publicLocation || cityLabel || raw,
    cityLabel: cityLabel || publicLocation || raw,
    locality,
    region,
    postalCode: zipMatch?.[1] ?? null,
    country: COUNTRY_RE.test(raw) || isMiami || region === 'FL' ? 'US' : 'US',
    isMiami,
    neighborhood: neighborhood?.id ?? null,
    neighborhoodName: neighborhood?.name ?? null,
  };
}
