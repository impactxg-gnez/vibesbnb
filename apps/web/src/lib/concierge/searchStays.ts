import { enumerateStayNightsYmd, nightsBetweenYmd } from '@/lib/dateUtils';
import { resolveGuestCapacity } from '@/lib/guestCapacity';
import { isUndefinedColumnError } from '@/lib/propertyDetailFetch';
import { normalizeMinBookingNights } from '@/lib/minBookingNights';
import { toTravelerPrice } from '@/lib/platformPricing';
import { getServiceFeePercent } from '@/lib/platformSettings';
import { listingCardImagesFromRow } from '@/lib/propertyImageUrls';
import { formatPublicLocation } from '@/lib/propertyLocationPrivacy';
import { staySearchToQuery } from '@/lib/staySearchParams';
import { createServiceClient } from '@/lib/supabase/service';
import type { StayCard, StaySearchInput, StaySearchResult } from '@/lib/concierge/types';

const SELECT_FULL = [
  'id',
  'name',
  'title',
  'location',
  'price',
  'guests',
  'allow_extra_guests',
  'max_extra_guests',
  'min_booking_nights',
  'latitude',
  'longitude',
  'cover_image',
  'wellness_friendly',
  'wellness_consumption_indoor_allowed',
  'wellness_consumption_outdoor_allowed',
  'custom_slug',
  'status',
].join(',');

const SELECT_CORE = [
  'id',
  'name',
  'title',
  'location',
  'price',
  'guests',
  'min_booking_nights',
  'latitude',
  'longitude',
  'cover_image',
  'wellness_friendly',
  'status',
].join(',');

const AREA_HINTS: Record<string, { keywords: string[]; lat: number; lng: number; radiusKm: number }> =
  {
    'north miami': {
      keywords: ['north miami', 'miami shores', 'north miami beach'],
      lat: 25.893,
      lng: -80.187,
      radiusKm: 14,
    },
    wynwood: { keywords: ['wynwood'], lat: 25.801, lng: -80.199, radiusKm: 6 },
    brickell: { keywords: ['brickell'], lat: 25.761, lng: -80.191, radiusKm: 5 },
    downtown: { keywords: ['downtown'], lat: 25.775, lng: -80.19, radiusKm: 6 },
    miami: { keywords: ['miami'], lat: 25.782, lng: -80.193, radiusKm: 28 },
  };

function kmBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hintForArea(area: string | null | undefined) {
  const key = String(area || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  const exact = AREA_HINTS[key];
  if (exact) return exact;
  const hit = Object.entries(AREA_HINTS).find(([name]) => key.includes(name) || name.includes(key));
  return hit ? hit[1] : { keywords: [key], lat: 25.782, lng: -80.193, radiusKm: 28 };
}

function areaMatches(location: string, hint: ReturnType<typeof hintForArea>, row: Record<string, unknown>): boolean {
  if (!hint) return true;
  const loc = location.toLowerCase();
  if (hint.keywords.some((k) => loc.includes(k))) return true;
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  if (
    hint.lat != null &&
    hint.lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    kmBetween(lat, lng, hint.lat, hint.lng) <= hint.radiusKm
  ) {
    return true;
  }
  return false;
}

function listingHref(id: string, input: StaySearchInput): string {
  const params = staySearchToQuery({
    checkIn: input.checkIn || undefined,
    checkOut: input.checkOut || undefined,
    guests: input.guests || undefined,
  });
  const qs = params.toString();
  return qs ? `/listings/${encodeURIComponent(id)}?${qs}` : `/listings/${encodeURIComponent(id)}`;
}

export async function searchStays(input: StaySearchInput): Promise<StaySearchResult> {
  const guests = Math.max(1, Math.floor(Number(input.guests) || 1));
  const checkIn = typeof input.checkIn === 'string' ? input.checkIn.slice(0, 10) : '';
  const checkOut = typeof input.checkOut === 'string' ? input.checkOut.slice(0, 10) : '';
  const nights = checkIn && checkOut ? nightsBetweenYmd(checkIn, checkOut) : 0;
  const nightKeys = checkIn && checkOut ? enumerateStayNightsYmd(checkIn, checkOut) : [];
  const maxNightly =
    input.maxNightly != null && Number.isFinite(Number(input.maxNightly))
      ? Number(input.maxNightly)
      : null;
  const hint = hintForArea(input.area);

  const service = createServiceClient();
  const feePercent = await getServiceFeePercent(service);

  let { data, error } = await service
    .from('properties')
    .select(SELECT_FULL)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error && (isUndefinedColumnError(error) || /custom_slug|max_extra_guests|allow_extra/i.test(error.message || ''))) {
    const retry = await service
      .from('properties')
      .select(SELECT_CORE)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200);
    data = retry.data;
    error = retry.error;
  }
  if (error) throw error;

  const rows = ((data || []) as unknown) as Record<string, unknown>[];

  const scoreRow = (row: Record<string, unknown>, relaxed: boolean) => {
    const notes: string[] = [];
    const location = formatPublicLocation(String(row.location || ''));
    if (hint && !areaMatches(String(row.location || ''), hint, row)) {
      if (!relaxed) return null;
      notes.push('Nearby area');
    }
    const capacity = resolveGuestCapacity({
      guests: Number(row.guests) || 1,
      allow_extra_guests: row.allow_extra_guests === true,
      max_extra_guests: row.max_extra_guests != null ? Number(row.max_extra_guests) : null,
    });
    if (capacity < guests) {
      if (!relaxed) return null;
      notes.push(`Sleeps ${capacity}`);
    }
    const minNights = normalizeMinBookingNights(row.min_booking_nights);
    if (nights > 0 && minNights && nights < minNights) {
      if (!relaxed) return null;
      notes.push(`${minNights}-night minimum`);
    }
    const guestNightly = toTravelerPrice(Number(row.price) || 0, feePercent);
    if (maxNightly != null && guestNightly > maxNightly) {
      if (!relaxed) return null;
      notes.push(`Guest rate $${guestNightly}/night`);
    }
    if (input.cannabisFriendly === true) {
      const friendly =
        row.wellness_friendly === true ||
        row.wellness_consumption_indoor_allowed === true ||
        row.wellness_consumption_outdoor_allowed === true;
      if (!friendly) {
        if (!relaxed) return null;
        notes.push('Cannabis policy may not match');
      }
    }
    return { row, guestNightly, capacity, notes };
  };

  let scored = rows.map((row) => scoreRow(row, false)).filter(Boolean) as NonNullable<
    ReturnType<typeof scoreRow>
  >[];
  let relaxed = false;
  if (scored.length === 0) {
    scored = rows.map((row) => scoreRow(row, true)).filter(Boolean) as NonNullable<
      ReturnType<typeof scoreRow>
    >[];
    relaxed = scored.length > 0;
  }

  let blocked = new Set<string>();
  if (nightKeys.length > 0 && scored.length > 0) {
    const ids = scored.map((s) => String(s.row.id)).slice(0, 160);
    const { data: blocks } = await service
      .from('property_availability')
      .select('property_id, day, status')
      .in('property_id', ids)
      .in('day', nightKeys)
      .in('status', ['blocked', 'booked']);
    for (const b of blocks || []) {
      if (b.property_id) blocked.add(String(b.property_id));
    }
  }

  const available = scored.filter((s) => !blocked.has(String(s.row.id)));
  const pool = available.length > 0 ? available : scored;
  if (available.length === 0 && scored.length > 0 && nightKeys.length > 0) {
    relaxed = true;
    pool.forEach((s) => s.notes.push('Those dates may be unavailable'));
  }

  pool.sort((a, b) => {
    const budgetA =
      maxNightly != null ? Math.abs(a.guestNightly - Math.min(a.guestNightly, maxNightly)) : 0;
    const budgetB =
      maxNightly != null ? Math.abs(b.guestNightly - Math.min(b.guestNightly, maxNightly)) : 0;
    return budgetA - budgetB || a.guestNightly - b.guestNightly;
  });

  const listings: StayCard[] = pool.slice(0, 3).map((s) => {
    const id = String(s.row.id);
    const name = String(s.row.name || s.row.title || 'VibesBNB stay');
    const cover = listingCardImagesFromRow(s.row)[0] || `/api/properties/${encodeURIComponent(id)}/cover`;
    return {
      id,
      name,
      location: formatPublicLocation(String(s.row.location || '')),
      guestNightly: s.guestNightly,
      guests: s.capacity,
      href: listingHref(id, input),
      cover,
      nights: nights || null,
      matchNotes: s.notes,
    };
  });

  const areaLabel = input.area?.trim() || 'your dates';
  let summary: string;
  if (listings.length === 0) {
    summary = `I could not find live listings that match ${areaLabel} yet. Try another neighborhood or a wider budget.`;
  } else if (relaxed) {
    summary = `Nothing matched every filter exactly. Here are the closest VibesBNB stays for ${areaLabel}.`;
  } else {
    summary = `Here are VibesBNB stays that fit ${areaLabel}${
      maxNightly != null ? `, up to about $${Math.round(maxNightly)}/night (guest rate)` : ''
    }.`;
  }

  return { listings, relaxed, summary };
}
