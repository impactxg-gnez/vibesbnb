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

export const PAYOUT_DETAILS_MISSING = 'Payout details are missing';

export function isHostPayoutDetailsComplete(info: unknown): boolean {
  if (!info || typeof info !== 'object') return false;
  const payout = info as Record<string, unknown>;
  if (payout.method === 'paypal' || payout.paypal_email || payout.paypal_email_masked) {
    return Boolean(String(payout.paypal_email || payout.paypal_email_masked || '').trim());
  }
  const holder = String(payout.account_holder_name || '').trim();
  const bank = String(payout.bank_name || '').trim();
  const account = String(payout.account_number_masked || '').trim();
  return Boolean(account || (holder && bank));
}

function isPayoutAccountRowComplete(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  if (String(row.status || '') === 'suspended') return false;
  const holder = String(row.account_holder_name || '').trim();
  const bank = String(row.bank_name || '').trim();
  const account = String(row.account_number_encrypted || '').trim();
  const routing = String(row.routing_number_encrypted || '').trim();
  return Boolean(holder && bank && account && routing);
}

export async function hostHasPayoutSetup(
  db: SupabaseClient,
  hostId: string
): Promise<boolean> {
  try {
    const { data } = await db.auth.admin.getUserById(hostId);
    if (isHostPayoutDetailsComplete(data.user?.user_metadata?.payout_info)) {
      return true;
    }
  } catch (error) {
    console.warn('[publish gate] host payout metadata', error);
  }

  const { data, error } = await db
    .from('payout_accounts')
    .select('account_holder_name, bank_name, account_number_encrypted, routing_number_encrypted, status')
    .eq('user_id', hostId)
    .maybeSingle();

  if (error) {
    if (isUndefinedColumnError(error) || error.code === '42P01') {
      return false;
    }
    console.warn('[publish gate] payout_accounts', error.message);
    return false;
  }

  return isPayoutAccountRowComplete(data as Record<string, unknown> | null);
}

export function publishBlockedMessage(blockers: string[]): string {
  if (blockers.length === 1 && blockers[0] === PAYOUT_DETAILS_MISSING) {
    return PAYOUT_DETAILS_MISSING;
  }
  return `Cannot publish yet. Missing: ${blockers.join('; ')}.`;
}

export async function assertCanPublishListing(params: {
  db: SupabaseClient;
  row: Record<string, unknown>;
  hostId: string;
}): Promise<string[]> {
  const row = withPublishClockDefaults(params.row);
  const blockers = listingPublishBlockers(row);
  const ok = await hostHasPayoutSetup(params.db, params.hostId);
  if (!ok) blockers.push(PAYOUT_DETAILS_MISSING);
  return blockers;
}
