import { PROPERTY_BROWSE_LIST_COLUMNS } from '@/lib/propertyPublicSelect';
import { fetchPropertyDetailRow } from '@/lib/propertyDetailFetch';
import { listingCardImagesFromRow } from '@/lib/propertyImageUrls';
import { createPublicSupabase } from '@/lib/seo/publicSupabase';
import { isMiamiLocation, parsePropertyPlace, type MiamiNeighborhoodId } from '@/lib/seo/propertyPlace';
import { resolvePropertyStayPolicies } from '@/lib/seo/propertyStayPolicies';

export const SEO_PROPERTY_PAGE_SIZE = 50;

export type SeoPropertyCard = {
  id: string;
  name: string;
  title: string;
  location: string;
  description: string | null;
  price: number | null;
  rating: number | null;
  reviewsCount: number;
  type: string | null;
  amenities: string[];
  guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  coverImage: string | null;
  images: string[];
  imageAlts?: unknown;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  allowExtraGuests: boolean;
  maxExtraGuests: number | null;
  cannabisIndoor: boolean;
  cannabisOutdoor: boolean;
  cannabisAllowed: boolean;
  fullyCannabisFriendly: boolean;
  tobaccoIndoor: boolean;
  tobaccoOutdoor: boolean;
  tobaccoAllowed: boolean;
  hasPatioOrBalcony: boolean;
  hasPrivateOutdoorSpace: boolean;
  isMiami: boolean;
  neighborhood: MiamiNeighborhoodId | null;
  neighborhoodName: string | null;
  publicLocation: string;
};

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s || null;
}

export function mapSeoPropertyRow(row: Record<string, unknown>): SeoPropertyCard | null {
  const id = str(row.id);
  if (!id) return null;
  const name = str(row.name) || str(row.title) || 'VibesBNB listing';
  const policies = resolvePropertyStayPolicies(row);
  const place = parsePropertyPlace(str(row.location));
  const images = listingCardImagesFromRow(row).filter(
    (url) => url && !url.includes('photo-1542718610')
  );
  const cover = str(row.cover_image);
  const coverImage =
    cover && /^https?:\/\//i.test(cover) && !cover.startsWith('data:')
      ? cover
      : images.find((u) => /^https?:\/\//i.test(u)) || null;

  return {
    id,
    name,
    title: str(row.title) || name,
    location: str(row.location) || '',
    description: str(row.description),
    price: num(row.price),
    rating: num(row.rating),
    reviewsCount: Math.max(0, Math.floor(num(row.reviews_count) || 0)),
    type: str(row.type),
    amenities: Array.isArray(row.amenities)
      ? row.amenities.map((a) => String(a ?? '').trim()).filter(Boolean)
      : [],
    guests: num(row.guests),
    bedrooms: num(row.bedrooms),
    bathrooms: num(row.bathrooms),
    beds: num(row.beds),
    coverImage,
    images,
    imageAlts: row.image_alts,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    checkInTime: str(row.check_in_time),
    checkOutTime: str(row.check_out_time),
    updatedAt: str(row.updated_at),
    createdAt: str(row.created_at),
    allowExtraGuests: row.allow_extra_guests === true || row.allowExtraGuests === true,
    maxExtraGuests: num(row.max_extra_guests ?? row.maxExtraGuests),
    cannabisIndoor: policies.cannabisIndoor,
    cannabisOutdoor: policies.cannabisOutdoor,
    cannabisAllowed: policies.cannabisAllowed,
    fullyCannabisFriendly: policies.fullyCannabisFriendly,
    tobaccoIndoor: policies.tobaccoIndoor,
    tobaccoOutdoor: policies.tobaccoOutdoor,
    tobaccoAllowed: policies.tobaccoAllowed,
    hasPatioOrBalcony: policies.hasPatioOrBalcony,
    hasPrivateOutdoorSpace: policies.hasPrivateOutdoorSpace,
    isMiami: place.isMiami || isMiamiLocation(str(row.location)),
    neighborhood: place.neighborhood,
    neighborhoodName: place.neighborhoodName,
    publicLocation: place.publicLocation,
  };
}

export async function fetchActiveSeoProperties(): Promise<SeoPropertyCard[]> {
  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const rows: Record<string, unknown>[] = [];
  let from = 0;
  while (from < 2000) {
    const to = from + SEO_PROPERTY_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('properties')
      .select(PROPERTY_BROWSE_LIST_COLUMNS)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) {
      if (rows.length > 0) break;
      console.warn('[seo] fetchActiveSeoProperties', error.message);
      return [];
    }
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    if (page.length === 0) break;
    rows.push(...page);
    if (page.length < SEO_PROPERTY_PAGE_SIZE) break;
    from += SEO_PROPERTY_PAGE_SIZE;
  }

  return rows.map(mapSeoPropertyRow).filter((p): p is SeoPropertyCard => p != null);
}

export async function fetchSeoPropertyById(id: string): Promise<SeoPropertyCard | null> {
  const supabase = createPublicSupabase();
  if (!supabase) return null;
  const { data, error } = await fetchPropertyDetailRow(supabase, id, { activeOnly: true });
  if (error || !data) {
    if (error) console.warn('[seo] fetchSeoPropertyById', error.message);
    return null;
  }
  return mapSeoPropertyRow(data);
}

export function miamiProperties(list: SeoPropertyCard[]): SeoPropertyCard[] {
  return list.filter((p) => p.isMiami);
}

export function neighborhoodProperties(
  list: SeoPropertyCard[],
  neighborhood: MiamiNeighborhoodId
): SeoPropertyCard[] {
  return list.filter((p) => p.neighborhood === neighborhood);
}

export function cannabisFriendlyProperties(list: SeoPropertyCard[]): SeoPropertyCard[] {
  return list.filter((p) => p.cannabisAllowed);
}
