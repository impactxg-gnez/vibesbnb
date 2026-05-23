'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchSection } from '@/components/home/SearchSection';
import Filters from '@/components/search/Filters';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PropertiesMap from '@/components/PropertiesMap';
import { DatePicker } from '@/components/ui/DatePicker';
import { PropertyCardMedia } from '@/components/properties/PropertyCardMedia';
import { PropertyCardFeatureRow } from '@/components/properties/PropertyCardFeatureRow';
import { PropertyCardRatingBadge } from '@/components/properties/PropertyCardRatingBadge';
import { HostStatusBadge } from '@/components/hosts/HostStatusBadge';
import { resolveHostBadge, type HostBadge } from '@/lib/hostBadge';
import { resolveSmokingFlags } from '@/lib/propertySmoking';
import { resolveWellnessConsumptionFlags } from '@/lib/wellnessConsumption';
import {
  enumerateStayNightsYmd,
  formatCalendarDate,
  nightsBetweenYmd,
  todayLocalYmd,
} from '@/lib/dateUtils';
import {
  listingHasAllAmenityChips,
  listingMatchesAnyPropertyTypeChip,
  listingMatchesHeaderCategory,
} from '@/lib/propertySearchFilters';
import { PROPERTY_BROWSE_LIST_COLUMNS } from '@/lib/propertyPublicSelect';
import { useAuth } from '@/contexts/AuthContext';
import { minNightsLabel, normalizeMinBookingNights } from '@/lib/minBookingNights';

interface Listing {
  id: string;
  title: string;
  name: string;
  location: string;
  price: number;
  rating?: number;
  reviews?: number;
  images: string[];
  type?: string;
  amenities?: string[];
  guests?: number;
  bedrooms?: number;
  beds?: number;
  host_id?: string;
  hostName?: string;
  hostAvatarUrl?: string;
  hostBadge?: HostBadge | null;
  status?: 'active' | 'draft' | 'inactive';
  coordinates?: { lat: number; lng: number };
  isAvailable?: boolean;
  wellnessFriendly?: boolean;
  wellnessConsumptionIndoorAllowed?: boolean;
  wellnessConsumptionOutdoorAllowed?: boolean;
  smokingInsideAllowed?: boolean;
  smokingOutsideAllowed?: boolean;
  minBookingNights?: number | null;
  createdAt?: string | null;
  [key: string]: any;
}

function calculateNights(checkIn: string, checkOut: string): number {
  return nightsBetweenYmd(checkIn, checkOut);
}

function formatDateShort(dateStr: string): string {
  return formatCalendarDate(dateStr, { month: 'short', day: 'numeric' });
}

const HISTOGRAM_BUCKET_COUNT = 40;
const PRICE_FILTER_CAP = 100_000;

type SearchModalFilters = {
  priceRange: [number, number];
  rooms: number;
  beds: number;
  bathrooms: number;
  propertyTypes: string[];
  amenities: string[];
};

function applyNonPriceListingFilters(
  listings: Listing[],
  filters: SearchModalFilters
): Listing[] {
  let L = listings;

  if (filters.rooms > 0) {
    L = L.filter((listing) => (listing.bedrooms || 0) >= filters.rooms);
  }
  if (filters.beds > 0) {
    L = L.filter((listing) => (listing.beds || listing.bedrooms || 0) >= filters.beds);
  }
  if (filters.bathrooms > 0) {
    L = L.filter((listing) => (listing.bathrooms || 0) >= filters.bathrooms);
  }

  if (filters.propertyTypes?.length > 0) {
    L = L.filter((listing) =>
      listingMatchesAnyPropertyTypeChip(
        listing.type,
        listing.title,
        listing.name,
        filters.propertyTypes
      )
    );
  }

  if (filters.amenities?.length > 0) {
    L = L.filter((listing) => listingHasAllAmenityChips(listing.amenities, filters.amenities));
  }

  return L;
}

function applyPriceRangeFilter(
  listings: Listing[],
  priceRange: [number, number] | undefined
): Listing[] {
  const [priceMin, priceMax] = priceRange || [0, Number.MAX_SAFE_INTEGER];
  const safeMin = Math.max(0, Number(priceMin) || 0);
  const safeMax = Math.max(safeMin, Number(priceMax) || 0);
  return listings.filter((listing) => listing.price >= safeMin && listing.price <= safeMax);
}

function computePriceDistribution(
  listings: Listing[],
  binCount: number
): { min: number; max: number; buckets: number[] } {
  const buckets = Array(binCount).fill(0);
  const prices = listings
    .map((l) => l.price)
    .filter((p) => Number.isFinite(p) && p >= 0);
  if (prices.length === 0) {
    return { min: 0, max: 1, buckets };
  }
  let lo = Math.min(...prices);
  let hi = Math.max(...prices);
  if (hi <= lo) {
    lo = Math.max(0, lo - 1);
    hi = hi + 1;
  }
  const span = hi - lo;
  for (const listing of listings) {
    const p = listing.price;
    if (!Number.isFinite(p)) continue;
    const clamped = Math.min(hi, Math.max(lo, p));
    const idx = Math.min(binCount - 1, Math.floor(((clamped - lo) / span) * binCount));
    buckets[idx]++;
  }
  return { min: lo, max: hi, buckets };
}

function sortSearchListings(
  listings: Listing[],
  sortParam: string,
  checkIn: string,
  checkOut: string
): Listing[] {
  const copy = [...listings];
  const dateSortActive = !!(checkIn && checkOut);

  if (sortParam === 'low-high') {
    copy.sort((a, b) => {
      if (dateSortActive) {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
      }
      return a.price - b.price;
    });
  } else if (sortParam === 'recent') {
    copy.sort((a, b) => {
      if (dateSortActive) {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
      }
      return b.id.localeCompare(a.id);
    });
  } else {
    copy.sort((a, b) => {
      if (dateSortActive) {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
      }
      return b.price - a.price;
    });
  }
  return copy;
}

const SEARCH_CATALOG_STORAGE_KEY = 'vbnb_search_catalog_v1';
const SEARCH_CATALOG_TTL_MS = 300_000;

type ProfileBrief = {
  avatar_url: string | null;
  full_name: string | null;
  host_badge?: string | null;
};
type SearchInventory = { properties: any[]; profileById: Record<string, ProfileBrief> };

function normalizeListingImageUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return 'https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available';
  }
  if (url.startsWith('data:') || url.startsWith('https://via.placeholder.com')) return url;
  try {
    new URL(url);
    return url;
  } catch {
    return 'https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available';
  }
}

function collectLocalStorageFallbackProperties(): any[] {
  const allProperties: any[] = [];
  if (typeof window === 'undefined') return allProperties;
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (!key.startsWith('properties_')) return;
    try {
      const userProperties = JSON.parse(localStorage.getItem(key) || '[]');
      const activeProperties = userProperties.filter(
        (p: any) => p.status === 'active' || !p.status
      );
      allProperties.push(...activeProperties);
    } catch (e) {
      console.error('[Search] Error parsing localStorage properties:', e);
    }
  });
  return allProperties;
}

/**
 * Loads the catalog once per session/tab (never on every URL tweak).
 * Dramatically reduces Supabase / Browse API IO when travellers change dates, guests, or sort.
 */
async function loadSearchCatalogOnce(): Promise<SearchInventory | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured =
    supabaseUrl &&
    supabaseUrl !== '' &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseKey &&
    supabaseKey !== '' &&
    supabaseKey !== 'placeholder-key';

  if (!isConfigured) {
    const rows = collectLocalStorageFallbackProperties();
    return rows.length ? { properties: rows, profileById: {} } : null;
  }

  try {
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SEARCH_CATALOG_STORAGE_KEY) : null;
    if (cached) {
      const { at, inv } = JSON.parse(cached) as { at: number; inv: SearchInventory };
      if (
        typeof at === 'number' &&
        Date.now() - at < SEARCH_CATALOG_TTL_MS &&
        Array.isArray(inv?.properties)
      ) {
        return inv;
      }
    }
  } catch {
    // ignore malformed cache
  }

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId =
      typeof window !== 'undefined' && controller
        ? window.setTimeout(() => controller.abort(), 12_000)
        : 0;
    try {
      const res = await fetch('/api/properties/browse', {
        method: 'GET',
        signal: controller?.signal,
      });
      if (res.ok) {
        const payload = await res.json();
        const properties = payload.properties ?? [];
        const profileById: Record<string, ProfileBrief> = {};
        for (const row of payload.profiles ?? []) {
          if (row?.id) {
            profileById[row.id] = {
              avatar_url: row.avatar_url ?? null,
              full_name: row.full_name ?? null,
              host_badge: row.host_badge ?? null,
            };
          }
        }
        const inv: SearchInventory = { properties, profileById };
        try {
          typeof sessionStorage !== 'undefined' &&
            sessionStorage.setItem(
              SEARCH_CATALOG_STORAGE_KEY,
              JSON.stringify({ at: Date.now(), inv })
            );
        } catch {
          // quota / private mode
        }
        return inv;
      }
    } catch {
      /* aborted or network — fall through to local fallback below */
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  } catch {
    /* fall through */
  }

  const rows = collectLocalStorageFallbackProperties();
  return rows.length ? { properties: rows, profileById: {} } : null;
}

function listingsFromInventory(inv: SearchInventory): Listing[] {
  return inv.properties.map((p: any) => {
    const smoking = resolveSmokingFlags(p as Record<string, unknown>);
    const consumption = resolveWellnessConsumptionFlags(p as Record<string, unknown>);
    const rawImages = p.images || [];
    const normalizedImages = rawImages
      .map(normalizeListingImageUrl)
      .filter((img: string) => img?.length > 0);
    const images =
      normalizedImages.length > 0
        ? normalizedImages
        : ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available'];

    const hostId = typeof p.host_id === 'string' ? p.host_id : '';
    const prof = hostId ? inv.profileById[hostId] : undefined;
    const hostName = (prof?.full_name || 'Host').trim() || 'Host';
    const hostAvatarUrl =
      prof?.avatar_url ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(hostId || hostName)}`;

    return {
      id: p.id,
      name: p.name || p.title || 'Untitled Property',
      title: p.name || p.title || 'Untitled Property',
      location: p.location || '',
      price: p.price ? Number(p.price) : 0,
      rating: p.rating ? Number(p.rating) : 0,
      reviews: p.reviews_count || 0,
      images,
      type: p.type || 'Property',
      amenities: p.amenities || [],
      guests: p.guests || 0,
      bedrooms: p.bedrooms || 0,
      beds: p.beds != null ? Number(p.beds) : undefined,
      bathrooms: p.bathrooms != null ? Number(p.bathrooms) : 0,
      wellnessFriendly: p.wellness_friendly === true,
      wellnessConsumptionIndoorAllowed: consumption.indoor,
      wellnessConsumptionOutdoorAllowed: consumption.outdoor,
      smokingInsideAllowed: smoking.inside,
      smokingOutsideAllowed: smoking.outside,
      host_id: hostId,
      hostName,
      hostAvatarUrl,
      hostBadge:
        prof?.host_badge === 'superbud' || prof?.host_badge === 'vibesetter'
          ? resolveHostBadge(prof.host_badge, null, true)
          : null,
      status: p.status || 'active',
      minBookingNights: normalizeMinBookingNights(p.min_booking_nights ?? p.minBookingNights),
      createdAt: typeof p.created_at === 'string' ? p.created_at : null,
      coordinates: p.coordinates
        ? { lat: Number(p.coordinates.lat), lng: Number(p.coordinates.lng) }
        : p.latitude && p.longitude
          ? { lat: Number(p.latitude), lng: Number(p.longitude) }
          : undefined,
    };
  });
}

/** Match location or property name/title for the main search box (works with all category filters). */
function listingMatchesLocationOrNameQuery(listing: Listing, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const loc = (listing.location || '').toLowerCase();
  const title = (listing.title || listing.name || '').toLowerCase();
  const name = (listing.name || '').toLowerCase();
  if (title.includes(q) || name.includes(q) || loc.includes(q)) return true;
  const terms = q.split(/[,\s]+/).filter((t) => t.length > 1);
  if (terms.length === 0) {
    return title.includes(q) || name.includes(q) || loc.includes(q);
  }
  return terms.every((t) => loc.includes(t) || name.includes(t) || title.includes(t));
}

function applyLocationGuestFilters(
  listings: Listing[],
  locationRaw: string,
  totalOccupancy: number
): Listing[] {
  let filteredListings = [...listings];

  if (locationRaw) {
    filteredListings = filteredListings.filter((listing) =>
      listingMatchesLocationOrNameQuery(listing, locationRaw)
    );
  }

  if (totalOccupancy > 0) {
    filteredListings = filteredListings.filter((listing) => {
      const propertyGuests = listing.guests || 0;
      if (propertyGuests === 0) return totalOccupancy <= 2;
      return propertyGuests >= totalOccupancy;
    });
  }

  return filteredListings;
}

// Listing card: shared media (thumbnails + heart) + host row in body
function ListingCard({
  listing,
  onHover,
  checkIn,
  checkOut,
  priorityImage = false,
  favoritesBatchLoading,
  favoritedFromBatch,
  onFavoriteChange,
}: {
  listing: Listing;
  onHover: (id: string | null) => void;
  checkIn?: string;
  checkOut?: string;
  /** Eager-load first visible card images (above-the-fold). */
  priorityImage?: boolean;
  favoritesBatchLoading?: boolean;
  favoritedFromBatch?: boolean;
  onFavoriteChange?: (propertyId: string, favorited: boolean) => void;
}) {
  const images = listing.images && listing.images.length > 0 ? listing.images : ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image'];
  
  // Build the listing URL with date params if available
  const listingUrl = `/listings/${listing.id}${checkIn || checkOut ? `?${checkIn ? `checkIn=${checkIn}` : ''}${checkIn && checkOut ? '&' : ''}${checkOut ? `checkOut=${checkOut}` : ''}` : ''}`;
  
  // Calculate stay info
  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;
  const totalPrice = nights > 0 ? listing.price * nights : listing.price;

  const availabilitySlot =
    checkIn && checkOut && listing.isAvailable !== undefined ? (
      <div
        className={`backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border text-xs font-bold ${
          listing.isAvailable
            ? 'bg-emerald-500/80 border-emerald-400/50 text-white'
            : 'bg-red-500/80 border-red-400/50 text-white'
        }`}
      >
        {listing.isAvailable ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Available
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Unavailable
          </>
        )}
      </div>
    ) : null;

  const bedroomCount = listing.bedrooms ?? listing.beds ?? 1;
  const bathroomCount = (() => {
    const b = Number(listing.bathrooms);
    return Number.isFinite(b) && b >= 0 ? b : 1;
  })();

  return (
    <div
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      className="group card flex flex-col h-full bg-surface border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors"
    >
      <PropertyCardMedia
        images={images}
        alt={listing.title || 'Property'}
        listingHref={listingUrl}
        propertyId={listing.id}
        favoriteBatchLoading={favoritesBatchLoading}
        favoriteFromBatch={favoritedFromBatch}
        onFavoriteChange={onFavoriteChange}
        wellnessConsumptionIndoorAllowed={!!listing.wellnessConsumptionIndoorAllowed}
        wellnessConsumptionOutdoorAllowed={!!listing.wellnessConsumptionOutdoorAllowed}
        smokingInsideAllowed={!!listing.smokingInsideAllowed}
        smokingOutsideAllowed={!!listing.smokingOutsideAllowed}
        topRightSlot={availabilitySlot}
        mainHeightClass="h-64"
        priority={priorityImage}
      />

      <Link href={listingUrl} className="flex-1 p-5">
        <div className="flex gap-3 items-start mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              listing.hostAvatarUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(listing.host_id || listing.hostName || 'Host')}`
            }
            alt={listing.hostName ? `Hosted by ${listing.hostName}` : 'Host'}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover border border-white/10 bg-white/5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-primary-500 transition-colors line-clamp-2">
                  {listing.title}
                </h3>
                {listing.hostBadge ? (
                  <div className="mb-1">
                    <HostStatusBadge badge={listing.hostBadge} size="sm" />
                  </div>
                ) : null}
                <p className="text-muted text-sm line-clamp-2">{listing.location}</p>
              </div>
              <PropertyCardRatingBadge
                rating={listing.rating}
                reviewCount={listing.reviews}
                createdAt={listing.createdAt}
              />
            </div>

            <PropertyCardFeatureRow
              propertyType={listing.type}
              guests={listing.guests || 2}
              bedrooms={bedroomCount}
              bathrooms={bathroomCount}
              className="mt-3"
            />
            {listing.minBookingNights != null && (
              <p className="text-xs text-amber-200/85 mt-2 font-medium">
                {minNightsLabel(listing.minBookingNights)}
              </p>
            )}
          </div>
        </div>

        {/* Selected Dates Display */}
        {checkIn && checkOut && nights > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-white font-medium">
              {formatDateShort(checkIn)} - {formatDateShort(checkOut)}
            </span>
            <span className="text-muted">({nights} {nights === 1 ? 'night' : 'nights'})</span>
          </div>
        )}
        
        <div className="flex items-end justify-between mt-4">
          {nights > 0 ? (
            <div>
              <p className="text-white font-bold text-xl">
                ${totalPrice} <span className="font-normal text-muted text-xs">total</span>
              </p>
              <p className="text-muted text-xs">${listing.price} × {nights} nights</p>
            </div>
          ) : (
            <p className="text-white font-bold text-xl">
              ${listing.price} <span className="font-normal text-muted text-xs">/ night</span>
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [baseListings, setBaseListings] = useState<Listing[]>([]);
  const [inventory, setInventory] = useState<SearchInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [sortBy, setSortBy] = useState('Price: High to Low');
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchModalFilters>({
    priceRange: [0, PRICE_FILTER_CAP],
    rooms: 0,
    beds: 0,
    bathrooms: 0,
    propertyTypes: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    amenities: []
  });
  
  // Get selected dates from URL
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const hasDateFilter = !!(checkIn && checkOut);
  const nights = hasDateFilter ? calculateNights(checkIn, checkOut) : 0;

  const [debouncedCheckIn, setDebouncedCheckIn] = useState(checkIn);
  const [debouncedCheckOut, setDebouncedCheckOut] = useState(checkOut);

  useEffect(() => {
    const h = window.setTimeout(() => {
      setDebouncedCheckIn(checkIn);
      setDebouncedCheckOut(checkOut);
    }, 450);
    return () => window.clearTimeout(h);
  }, [checkIn, checkOut]);

  const urlLocation = searchParams.get('location') || '';
  const urlGuests = parseInt(searchParams.get('guests') || '0', 10);
  const urlKids = parseInt(searchParams.get('kids') || '0', 10);

  // Sync URL categories to activeFilters
  useEffect(() => {
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    setActiveFilters((prev) => {
      if (JSON.stringify(categories) === JSON.stringify(prev.propertyTypes)) return prev;
      return { ...prev, propertyTypes: categories };
    });
  }, [searchParams]);

  // Load catalog once (browse API / Supabase / local fallback). Dates, guests, location only refilter locally + availability queries.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const inv = await loadSearchCatalogOnce();
        if (!cancelled) setInventory(inv);
      } catch (e) {
        console.error('[Search] Failed to load catalog:', e);
        if (!cancelled) setInventory(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!inventory) {
      setBaseListings([]);
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseConfigured =
      !!supabaseUrl &&
      supabaseUrl !== '' &&
      supabaseUrl !== 'https://placeholder.supabase.co' &&
      !!supabaseKey &&
      supabaseKey !== '' &&
      supabaseKey !== 'placeholder-key';

    const totalOcc = urlGuests + urlKids;
    const canonical = listingsFromInventory(inventory);
    const filteredListings = applyLocationGuestFilters(canonical, urlLocation, totalOcc);

    let cancelled = false;

    const clearAvail = (): Listing[] =>
      filteredListings.map((l) => ({ ...l, isAvailable: undefined }));

    if (!debouncedCheckIn || !debouncedCheckOut || !supabaseConfigured) {
      setBaseListings(clearAvail());
      return;
    }

    void (async () => {
      try {
        const datesToCheck = enumerateStayNightsYmd(debouncedCheckIn, debouncedCheckOut);
        if (datesToCheck.length === 0) {
          if (!cancelled) setBaseListings(clearAvail());
          return;
        }

        const propertyIds = filteredListings.map((l) => l.id);
        const blockedDates: { property_id: string; day: string; status: string }[] = [];
        let availErr: { message?: string } | null = null;

        const batchSize = 120;
        for (let i = 0; i < propertyIds.length; i += batchSize) {
          const slice = propertyIds.slice(i, i + batchSize);
          const res = await fetch('/api/properties/availability-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyIds: slice, nights: datesToCheck }),
          });
          if (!res.ok) {
            availErr = { message: await res.text() };
            break;
          }
          const json = (await res.json()) as {
            blocked?: { property_id: string; day: string; status: string }[];
          };
          if (json.blocked?.length) blockedDates.push(...json.blocked);
        }

        if (cancelled) return;

        if (availErr) {
          setBaseListings(clearAvail());
          return;
        }

        const unavailablePropertyIds = new Set(blockedDates.map((b) => b.property_id));
        let merged = filteredListings.map((listing) => ({
          ...listing,
          isAvailable: !unavailablePropertyIds.has(listing.id),
        }));

        merged.sort((a, b) => {
          if (a.isAvailable && !b.isAvailable) return -1;
          if (!a.isAvailable && b.isAvailable) return 1;
          return 0;
        });

        setBaseListings(merged);
      } catch (e) {
        console.warn('[Search] Error checking availability:', e);
        if (!cancelled) setBaseListings(clearAvail());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inventory, urlLocation, urlGuests, urlKids, debouncedCheckIn, debouncedCheckOut]);

  const nonPriceFiltered = useMemo(
    () => applyNonPriceListingFilters(baseListings, activeFilters),
    [baseListings, activeFilters]
  );

  const priceDistribution = useMemo(
    () => computePriceDistribution(nonPriceFiltered, HISTOGRAM_BUCKET_COUNT),
    [nonPriceFiltered]
  );

  // Keep price range inside [0, catalog max]. When the catalog first loads, prev can be [0, 1]
  // from the empty-list placeholder distribution — clamping hi with max(min, hi) would collapse
  // both ends to catalog min ($96). Reset stale ranges to full span: $0 to catalog max.
  useEffect(() => {
    const catMin = priceDistribution.min;
    const catMax = priceDistribution.max;
    if (!Number.isFinite(catMin) || !Number.isFinite(catMax) || catMax <= 0) return;
    setActiveFilters((prev) => {
      const lo = prev.priceRange[0];
      const hi = prev.priceRange[1];
      if (hi < catMin) {
        return { ...prev, priceRange: [0, catMax] };
      }
      const nLo = Math.min(catMax, Math.max(0, lo));
      const nHi = Math.min(catMax, Math.max(0, hi));
      const adjLo = Math.min(nLo, nHi);
      const adjHi = Math.max(nLo, nHi);
      if (adjLo === lo && adjHi === hi) return prev;
      return { ...prev, priceRange: [adjLo, adjHi] };
    });
  }, [priceDistribution.min, priceDistribution.max]);

  const sortParam = searchParams.get('sort') || 'high-low';
  const headerCategory = searchParams.get('category');

  const listings = useMemo(() => {
    let priced = applyPriceRangeFilter(nonPriceFiltered, activeFilters.priceRange);
    if (headerCategory) {
      priced = priced.filter((listing) =>
        listingMatchesHeaderCategory(
          {
            type: listing.type,
            title: listing.title,
            name: listing.name,
            bedrooms: listing.bedrooms,
            beds: listing.beds,
          },
          headerCategory
        )
      );
    }
    return sortSearchListings(priced, sortParam, checkIn, checkOut);
  }, [nonPriceFiltered, activeFilters.priceRange, sortParam, checkIn, checkOut, headerCategory]);

  useEffect(() => {
    if (sortParam === 'low-high') setSortBy('Price: Low to High');
    else if (sortParam === 'recent') setSortBy('Most Recent');
    else setSortBy('Price: High to Low');
  }, [sortParam]);

  const displayedListings = hideUnavailable
    ? listings.filter((l) => l.isAvailable !== false)
    : listings;

  const favoritesCatalogKey = useMemo(
    () => [...displayedListings.map((l) => l.id)].sort().join('|'),
    [displayedListings]
  );

  const [batchedFavoriteIds, setBatchedFavoriteIds] = useState(() => new Set<string>());
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setBatchedFavoriteIds(new Set());
      setFavoritesLoading(false);
      return;
    }

    const ids =
      favoritesCatalogKey.length > 0 ? favoritesCatalogKey.split('|').filter(Boolean) : [];

    if (ids.length === 0) {
      setBatchedFavoriteIds(new Set());
      setFavoritesLoading(false);
      return;
    }

    let cancelled = false;
    setFavoritesLoading(true);

    void (async () => {
      try {
        const supabase = createClient();
        const chunkSize = 120;
        const next = new Set<string>();
        for (let i = 0; i < ids.length; i += chunkSize) {
          const slice = ids.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('favorites')
            .select('property_id')
            .eq('user_id', user.id!)
            .in('property_id', slice);
          if (cancelled) return;
          if (error) {
            console.warn('[Search] Batch favorites:', error.message);
            break;
          }
          (data ?? []).forEach((row: { property_id?: string }) => {
            if (row.property_id) next.add(row.property_id);
          });
        }
        if (!cancelled) setBatchedFavoriteIds(next);
      } finally {
        if (!cancelled) setFavoritesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, favoritesCatalogKey]);

  const syncFavoriteToggle = useCallback((pid: string, favorited: boolean) => {
    setBatchedFavoriteIds((prev) => {
      const n = new Set(prev);
      if (favorited) n.add(pid);
      else n.delete(pid);
      return n;
    });
  }, []);

  const favoritesBatchBusy = Boolean(user?.id && favoritesLoading);
  const availableCount = listings.filter((l) => l.isAvailable !== false).length;
  const unavailableCount = listings.filter((l) => l.isAvailable === false).length;

  const [priceRangeMin, priceRangeMax] = activeFilters.priceRange;
  const catalogMin = priceDistribution.min;
  const catalogMax = priceDistribution.max;
  // "No price filter" = $0 through catalog max (not catalog min, so cheap stays aren't excluded by default)
  const priceFilterActive =
    Math.round(priceRangeMin) !== 0 || Math.round(priceRangeMax) !== Math.round(catalogMax);

  const handlePriceRangeLive = useCallback((lo: number, hi: number) => {
    setActiveFilters((prev) => ({ ...prev, priceRange: [lo, hi] }));
  }, []);
  const filterChipCount =
    activeFilters.propertyTypes.length +
    activeFilters.amenities.length +
    (activeFilters.rooms > 0 ? 1 : 0) +
    (activeFilters.beds > 0 ? 1 : 0) +
    (activeFilters.bathrooms > 0 ? 1 : 0) +
    (priceFilterActive ? 1 : 0);
  const showFilterChip =
    activeFilters.rooms > 0 ||
    activeFilters.beds > 0 ||
    activeFilters.bathrooms > 0 ||
    activeFilters.propertyTypes.length > 0 ||
    activeFilters.amenities.length > 0 ||
    priceFilterActive;

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-emerald-600 py-4 md:py-8">
        <div className="container mx-auto px-3 md:px-4">
          <SearchSection
            enableNegativeMargin={false}
            initialValues={{
              location: searchParams.get('location') || '',
              checkIn: searchParams.get('checkIn') || '',
              checkOut: searchParams.get('checkOut') || '',
              guests: parseInt(searchParams.get('guests') || '1'),
              kids: parseInt(searchParams.get('kids') || '0'),
              pets: parseInt(searchParams.get('pets') || '0'),
              categories: searchParams.get('categories')?.split(',') || []
            }}
          />
        </div>
      </div>

      <div className="px-3 md:px-6 py-4 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
          {/* Listings Column */}
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white">
                  {loading ? 'Searching...' : `${displayedListings.length} stays in ${searchParams.get('location') || 'all locations'}`}
                </h2>
                {/* Show selected dates summary */}
                {hasDateFilter && !loading && (
                  <p className="text-sm text-primary-500 mt-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDateShort(checkIn)} - {formatDateShort(checkOut)} ({nights} {nights === 1 ? 'night' : 'nights'})
                    {unavailableCount > 0 && (
                      <span className="text-muted">
                        • {availableCount} available
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowDatePicker(!showDatePicker);
                      setShowGuestPicker(false);
                    }}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-surface border border-white/10 rounded-full text-sm hover:bg-surface-light transition-all"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Dates</span>
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 p-4 w-[min(calc(100vw-1.5rem),20rem)] min-w-0 sm:min-w-[280px] sm:w-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Check In</label>
                          <DatePicker
                            value={searchParams.get('checkIn') || ''}
                            onChange={(dateStr) => {
                              const params = new URLSearchParams(searchParams.toString());
                              if (dateStr) params.set('checkIn', dateStr);
                              else params.delete('checkIn');
                              router.push(`/search?${params.toString()}`);
                            }}
                            min={todayLocalYmd()}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Check Out</label>
                          <DatePicker
                            value={searchParams.get('checkOut') || ''}
                            onChange={(dateStr) => {
                              const params = new URLSearchParams(searchParams.toString());
                              if (dateStr) params.set('checkOut', dateStr);
                              else params.delete('checkOut');
                              router.push(`/search?${params.toString()}`);
                            }}
                            min={searchParams.get('checkIn') || todayLocalYmd()}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="mt-4 w-full px-4 py-2 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-400 transition"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowGuestPicker(!showGuestPicker);
                      setShowDatePicker(false);
                    }}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-surface border border-white/10 rounded-full text-sm hover:bg-surface-light transition-all"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden sm:inline">Guests</span>
                  </button>
                  {showGuestPicker && (
                    <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 p-4 w-[min(calc(100vw-1.5rem),18rem)] min-w-0 sm:min-w-[240px] sm:w-auto">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white text-sm font-semibold">Adults</span>
                            <p className="text-gray-400 text-xs">Ages 13+</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const currentGuests = parseInt(searchParams.get('guests') || '1');
                                if (currentGuests > 1) {
                                  const params = new URLSearchParams(searchParams.toString());
                                  params.set('guests', (currentGuests - 1).toString());
                                  router.push(`/search?${params.toString()}`);
                                }
                              }}
                              className="w-8 h-8 rounded-lg border border-white/10 text-white hover:bg-white/10 flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="text-white font-semibold w-6 text-center">{searchParams.get('guests') || '1'}</span>
                            <button
                              onClick={() => {
                                const currentGuests = parseInt(searchParams.get('guests') || '1');
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('guests', (currentGuests + 1).toString());
                                router.push(`/search?${params.toString()}`);
                              }}
                              className="w-8 h-8 rounded-lg border border-white/10 text-white hover:bg-white/10 flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowGuestPicker(false)}
                        className="mt-4 w-full px-4 py-2 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-400 transition"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams.toString());
                    if (e.target.value === 'Price: Low to High') {
                      params.set('sort', 'low-high');
                    } else if (e.target.value === 'Price: High to Low') {
                      params.set('sort', 'high-low');
                    } else {
                      params.set('sort', 'recent');
                    }
                    router.push(`/search?${params.toString()}`);
                  }}
                  className="px-3 md:px-4 py-2 bg-surface border border-white/10 text-white rounded-full text-xs md:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                >
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Most Recent</option>
                </select>
                {/* Hide unavailable toggle - only show when dates are selected */}
                {hasDateFilter && unavailableCount > 0 && (
                  <button
                    onClick={() => setHideUnavailable(!hideUnavailable)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
                      hideUnavailable 
                        ? 'bg-primary-500 text-black' 
                        : 'bg-surface border border-white/10 text-white hover:bg-surface-light'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {hideUnavailable ? 'Showing available only' : 'Hide unavailable'}
                  </button>
                )}
                <button
                  onClick={() => setShowFiltersModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black rounded-full text-sm font-bold shadow-[0_10px_20px_rgba(0,230,118,0.2)] hover:bg-primary-400 transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Filters
                  {showFilterChip && (
                    <span className="w-5 h-5 bg-black text-primary-500 rounded-full text-[10px] flex items-center justify-center border border-primary-500/50">
                      {filterChipCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filters Modal Overlay */}
            {showFiltersModal && (
              <div className="fixed inset-0 z-[100] flex justify-end">
                <div 
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => setShowFiltersModal(false)}
                />
                <div className="relative w-full max-w-xl bg-gray-950 shadow-2xl animate-in slide-in-from-right duration-300">
                  <Filters 
                    initialFilters={activeFilters}
                    priceDistribution={priceDistribution}
                    onPriceRangeLive={handlePriceRangeLive}
                    onClose={() => setShowFiltersModal(false)}
                    onApply={(filters) => {
                      setActiveFilters(filters);
                      setShowFiltersModal(false);
                    }}
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="animate-pulse">
                    <div className="bg-surface h-72 rounded-3xl mb-3"></div>
                    <div className="bg-surface h-4 rounded w-3/4 mb-2"></div>
                    <div className="bg-surface h-4 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : displayedListings.length === 0 ? (
              <div className="bg-surface border border-white/5 rounded-3xl p-12 text-center shadow-xl">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {hideUnavailable && listings.length > 0 
                    ? 'No available properties for these dates' 
                    : 'No properties found'}
                </h3>
                <p className="text-muted mb-6">
                  {hideUnavailable && listings.length > 0 
                    ? 'Try different dates or show all properties including unavailable ones'
                    : 'Try adjusting your search criteria or browse all available properties'}
                </p>
                {hideUnavailable && listings.length > 0 ? (
                  <button
                    onClick={() => setHideUnavailable(false)}
                    className="btn-primary"
                  >
                    Show All Properties
                  </button>
                ) : (
                  <Link
                    href="/search"
                    className="btn-primary"
                  >
                    Browse All Properties
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedListings.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onHover={setHoveredListingId}
                    checkIn={checkIn || undefined}
                    checkOut={checkOut || undefined}
                    priorityImage={index < 4}
                    favoritesBatchLoading={user?.id ? favoritesBatchBusy : undefined}
                    favoritedFromBatch={user?.id ? batchedFavoriteIds.has(listing.id) : undefined}
                    onFavoriteChange={user?.id ? syncFavoriteToggle : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Map Column */}
          <div className="hidden lg:block lg:w-1/2 order-1 lg:order-2 sticky top-[100px] h-[calc(100vh-140px)]">
            <PropertiesMap 
              properties={displayedListings} 
              className="w-full h-full rounded-3xl border border-white/10 shadow-2xl" 
              hoveredListingId={hoveredListingId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
