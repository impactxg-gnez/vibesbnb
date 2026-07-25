import type { SupabaseClient } from '@supabase/supabase-js';
import { PLATFORM_FEE_PERCENT } from '@vibesbnb/shared';
import { nightsBetweenYmd } from '@/lib/dateUtils';
import { computeLodgingWithBakedFee } from '@/lib/platformPricing';

export type HostPayoutStatus = 'pending' | 'paid' | 'cancelled';

export type HostPayoutAmounts = {
  guestTotal: number;
  platformFee: number;
  hostAmount: number;
  nights: number;
};

function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function datePart(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.split('T')[0];
}

/**
 * Host payout = lodging host subtotal (nights × nightly + cleaning).
 * Falls back to reversing platform fee from guest total when property rates missing.
 */
export function computeHostPayoutAmounts(params: {
  checkIn?: string | null;
  checkOut?: string | null;
  guestTotal?: number | null;
  hostNightlyRate?: number | null;
  hostCleaningFee?: number | null;
  feePercent?: number;
}): HostPayoutAmounts {
  const feePercent = params.feePercent ?? PLATFORM_FEE_PERCENT;
  const checkIn = datePart(params.checkIn) || '';
  const checkOut = datePart(params.checkOut) || '';
  const nights = nightsBetweenYmd(checkIn, checkOut);
  const guestTotal = roundMoney(Number(params.guestTotal) || 0);
  const nightly = Number(params.hostNightlyRate);
  const cleaning = Math.max(0, Number(params.hostCleaningFee) || 0);

  if (nights > 0 && Number.isFinite(nightly) && nightly >= 0) {
    const lodging = computeLodgingWithBakedFee({
      hostNightlyRate: nightly,
      nights,
      hostCleaningFee: cleaning,
      feePercent,
    });
    return {
      guestTotal: guestTotal > 0 ? guestTotal : lodging.travelerLodgingTotal,
      platformFee: roundMoney(lodging.platformFee),
      hostAmount: roundMoney(lodging.hostSubtotal),
      nights,
    };
  }

  // Approximate when we only know guest total
  const hostAmount = roundMoney(guestTotal * (100 / (100 + feePercent)));
  const platformFee = roundMoney(guestTotal - hostAmount);
  return { guestTotal, platformFee, hostAmount, nights };
}

type BookingRow = {
  id: string;
  host_id?: string | null;
  property_id?: string | null;
  property_name?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  total_price?: number | null;
  status?: string | null;
  payment_status?: string | null;
};

/**
 * Create or refresh a pending host_payouts row after guest payment.
 * No-op if booking is cancelled/rejected or not paid.
 */
export async function ensurePendingHostPayout(
  service: SupabaseClient,
  bookingId: string
): Promise<{ ok: boolean; payoutId?: string; error?: string }> {
  const { data: booking, error: bookingError } = await service
    .from('bookings')
    .select(
      'id, host_id, property_id, property_name, check_in, check_out, total_price, status, payment_status'
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return { ok: false, error: bookingError?.message || 'Booking not found' };
  }

  const row = booking as BookingRow;
  if (!row.host_id) {
    return { ok: false, error: 'Booking has no host' };
  }

  const status = String(row.status || '');
  const paymentStatus = String(row.payment_status || '');

  if (status === 'cancelled' || status === 'rejected') {
    return { ok: false, error: 'Booking is cancelled' };
  }
  if (paymentStatus !== 'paid') {
    return { ok: false, error: 'Booking is not paid' };
  }

  const { data: existing } = await service
    .from('host_payouts')
    .select('id, status')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (existing?.status === 'paid') {
    return { ok: true, payoutId: existing.id as string };
  }

  let hostNightlyRate: number | null = null;
  let hostCleaningFee = 0;
  if (row.property_id) {
    const { data: property } = await service
      .from('properties')
      .select('price, cleaning_fee')
      .eq('id', row.property_id)
      .maybeSingle();
    if (property) {
      hostNightlyRate = Number(property.price) || 0;
      hostCleaningFee =
        property.cleaning_fee != null ? Number(property.cleaning_fee) || 0 : 0;
    }
  }

  const amounts = computeHostPayoutAmounts({
    checkIn: row.check_in,
    checkOut: row.check_out,
    guestTotal: row.total_price,
    hostNightlyRate,
    hostCleaningFee,
  });

  const payload = {
    booking_id: bookingId,
    host_id: row.host_id,
    property_id: row.property_id || null,
    guest_total: amounts.guestTotal,
    platform_fee: amounts.platformFee,
    host_amount: amounts.hostAmount,
    currency: 'USD',
    status: 'pending' as const,
    check_in: datePart(row.check_in),
    check_out: datePart(row.check_out),
    property_name: row.property_name || null,
    cancelled_at: null,
    cancel_reason: null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await service
      .from('host_payouts')
      .update(payload)
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, payoutId: existing.id as string };
  }

  const { data: inserted, error: insertError } = await service
    .from('host_payouts')
    .insert(payload)
    .select('id')
    .maybeSingle();

  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true, payoutId: inserted?.id as string | undefined };
}

/** Mark ledger cancelled when a paid booking is cancelled (only if still pending). */
export async function cancelHostPayoutForBooking(
  service: SupabaseClient,
  bookingId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: existing, error: findError } = await service
    .from('host_payouts')
    .select('id, status')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (findError) return { ok: false, error: findError.message };
  if (!existing) return { ok: true };
  if (existing.status === 'paid') {
    return { ok: false, error: 'Payout already paid; contact support to reverse' };
  }
  if (existing.status === 'cancelled') return { ok: true };

  const { error } = await service
    .from('host_payouts')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason?.trim() || 'Booking cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .eq('status', 'pending');

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markHostPayoutPaid(
  service: SupabaseClient,
  payoutId: string,
  adminId: string,
  opts?: { transferRef?: string; notes?: string }
): Promise<{ ok: boolean; error?: string }> {
  const { data: existing, error: findError } = await service
    .from('host_payouts')
    .select('id, status')
    .eq('id', payoutId)
    .maybeSingle();

  if (findError || !existing) {
    return { ok: false, error: findError?.message || 'Payout not found' };
  }
  if (existing.status === 'cancelled') {
    return { ok: false, error: 'Cannot mark a cancelled payout as paid' };
  }
  if (existing.status === 'paid') {
    return { ok: true };
  }

  const { error } = await service
    .from('host_payouts')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: adminId,
      transfer_ref: opts?.transferRef?.trim() || null,
      notes: opts?.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payoutId)
    .eq('status', 'pending');

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
