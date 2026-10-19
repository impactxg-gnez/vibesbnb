import { DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME, normalizeHhmm } from '@/lib/checkInOutPolicy';
import { isUndefinedColumnError } from '@/lib/propertyDetailFetch';
import { isStockPlaceholderImageUrl } from '@/lib/propertyImageUrls';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MIN_CURATED_LISTING_PHOTOS = 8;

export function countCuratedListingPhotos(row: Record<string, unknown>): number {
  const urls = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const url = value.trim();
    if (!url || url.toLowerCase().startsWith('data:') || isStockPlaceholderImageUrl(url)) return;
    if (/^https?:\/\//i.test(url) || url.startsWith('/')) urls.add(url);
  };
  if (Array.isArray(row.images)) row.images.forEach(add);
  add(row.cover_image);
  if (Array.isArray(row.rooms)) {
    for (const room of row.rooms) {
      if (!room || typeof room !== 'object') continue;
      const images = (room as { images?: unknown }).images;
      if (Array.isArray(images)) images.forEach(add);
    }
  }
  return urls.size;
}

export function listingPublishBlockers(row: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    missing.push('Map coordinates (address pin)');
  }
  const location = typeof row.location === 'string' ? row.location.trim() : '';
  if (!location) missing.push('Street address / location');

  const price = Number(row.price);
  if (!Number.isFinite(price) || price <= 0) missing.push('Nightly price');

  if (!normalizeHhmm(row.check_in_time) && !normalizeHhmm(row.checkInTime)) {
    missing.push('Check-in time (4:00 PM Eastern)');
  }
  if (!normalizeHhmm(row.check_out_time) && !normalizeHhmm(row.checkOutTime)) {
    missing.push('Check-out time (11:00 AM Eastern)');
  }

  const photos = countCuratedListingPhotos(row);
  if (photos < MIN_CURATED_LISTING_PHOTOS) {
    missing.push(`At least ${MIN_CURATED_LISTING_PHOTOS} curated photos (you have ${photos})`);
  }

  const indoor =
    row.wellness_consumption_indoor_allowed === true ||
    row.wellnessConsumptionIndoorAllowed === true;
  const outdoor =
    row.wellness_consumption_outdoor_allowed === true ||
    row.wellnessConsumptionOutdoorAllowed === true;
  const friendly =
    row.wellness_friendly === true || row.wellnessFriendly === true || indoor || outdoor;
  if (friendly && !indoor && !outdoor) {
    missing.push('Wellness area (inside, outside, or both) — or turn wellness off');
  }

  return missing;
}

export function withPublishClockDefaults(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row };
  if (!normalizeHhmm(next.check_in_time) && !normalizeHhmm(next.checkInTime)) {
    next.check_in_time = DEFAULT_CHECK_IN_TIME;
  }
  if (!normalizeHhmm(next.check_out_time) && !normalizeHhmm(next.checkOutTime)) {
    next.check_out_time = DEFAULT_CHECK_OUT_TIME;
  }
  next.allow_direct_booking = false;
  return next;
}

export async function hostHasPayoutSetup(
  db: SupabaseClient,
  hostId: string
): Promise<boolean> {
  const { data, error } = await db
    .from('payout_accounts')
    .select('status')
    .eq('user_id', hostId)
    .maybeSingle();
  if (error) {
    if (isUndefinedColumnError(error) || error.code === '42P01') return true;
    console.warn('[publish gate] payout_accounts', error.message);
    return true;
  }
  const status = String(data?.status || '');
  return Boolean(data) && status !== 'suspended';
}

export function publishBlockedMessage(blockers: string[]): string {
  return `Cannot publish yet. Missing: ${blockers.join('; ')}.`;
}

export async function assertCanPublishListing(params: {
  db: SupabaseClient;
  row: Record<string, unknown>;
  hostId: string;
  skipPayout?: boolean;
}): Promise<string[]> {
  const row = withPublishClockDefaults(params.row);
  const blockers = listingPublishBlockers(row);
  if (!params.skipPayout) {
    const ok = await hostHasPayoutSetup(params.db, params.hostId);
    if (!ok) blockers.push('Payout setup (US bank or PayPal) in Host earnings');
  }
  return blockers;
}
