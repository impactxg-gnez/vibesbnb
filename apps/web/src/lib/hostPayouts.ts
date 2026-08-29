import type { SupabaseClient } from '@supabase/supabase-js';
import { HOST_FEE_PERCENT, PLATFORM_FEE_PERCENT } from '@vibesbnb/shared';
import { computeBookingQuote } from '@/lib/bookingQuote';
import {
  computeEarlyLateFees,
  policyFromDbRow,
} from '@/lib/checkInOutPolicy';
import { nightsBetweenYmd } from '@/lib/dateUtils';
import {
  getHostFeePercent,
  getServiceFeePercent,
} from '@/lib/platformSettings';
import { computeLodgingWithBakedFee } from '@/lib/platformPricing';

export type HostPayoutStatus = 'pending' | 'paid' | 'cancelled';

export type HostPayoutAmounts = {
  guestTotal: number;
  /** Guest service fee markup (VibesBNB keep from traveler lodging). */
  platformFee: number;
  /** Host-side fee — % of guest grand total, deducted from host payout. */
  hostFee: number;
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

type PayoutBookingContext = {
  checkIn?: string | null;
  checkOut?: string | null;
  guestTotal?: number | null;
  guests?: number | null;
  kids?: number | null;
  pets?: number | null;
  wellness_line_items?: unknown;
  early_check_in_requested?: boolean | null;
  late_check_out_requested?: boolean | null;
  selected_units?: Array<{ price?: unknown }> | null;
};

type PayoutPropertyContext = {
  price?: number | null;
  cleaning_fee?: number | null;
  guests?: number | null;
  allow_extra_guests?: boolean | null;
  extra_guest_price?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  early_check_in_allowed?: boolean | null;
  earliest_early_check_in_time?: string | null;
  early_check_in_fee?: number | null;
  late_check_out_allowed?: boolean | null;
  latest_late_check_out_time?: string | null;
  late_check_out_fee?: number | null;
};

/**
 * Host payout = lodging earnings minus host fee (% of guest grand total).
 * Guest service fee markup is separate (paid by guest, not deducted here).
 */
export function computeHostPayoutAmounts(params: {
  checkIn?: string | null;
  checkOut?: string | null;
  guestTotal?: number | null;
  hostNightlyRate?: number | null;
  hostCleaningFee?: number | null;
  feePercent?: number;
  hostFeePercent?: number;
  booking?: PayoutBookingContext | null;
  property?: PayoutPropertyContext | null;
}): HostPayoutAmounts {
  const feePercent = params.feePercent ?? PLATFORM_FEE_PERCENT;
  const hostFeePercent = params.hostFeePercent ?? HOST_FEE_PERCENT;
  const checkIn = datePart(params.checkIn) || '';
  const checkOut = datePart(params.checkOut) || '';
  const nights = nightsBetweenYmd(checkIn, checkOut);
  const guestTotal = roundMoney(Number(params.guestTotal) || 0);
  const nightly = Number(params.hostNightlyRate);
  const cleaning = Math.max(0, Number(params.hostCleaningFee) || 0);

  let platformFee = 0;
  let hostLodgingGross = 0;

  const property = params.property;
  const booking = params.booking;

  if (property && checkIn && checkOut && nights > 0) {
    const policy = policyFromDbRow(property as Record<string, unknown>);
    const { earlyFee, lateFee } = computeEarlyLateFees({
      policy,
      earlyRequested: booking?.early_check_in_requested === true,
      lateRequested: booking?.late_check_out_requested === true,
    });

    let hostNightlyRate = Number(property.price) || 0;
    if (booking?.selected_units?.length) {
      hostNightlyRate = booking.selected_units.reduce(
        (sum, u) => sum + (Number(u?.price) || 0),
        0
      );
    } else if (Number.isFinite(nightly) && nightly >= 0) {
      hostNightlyRate = nightly;
    }

    const quote = computeBookingQuote({
      checkInYmd: checkIn,
      checkOutYmd: checkOut,
      hostNightlyRate,
      hostCleaningFee: cleaning,
      allowExtraGuests: property.allow_extra_guests === true,
      extraGuestPrice: Number(property.extra_guest_price) || 0,
      includedGuests: Number(property.guests) || 1,
      adults: Number(booking?.guests) || 1,
      kids: Number(booking?.kids) || 0,
      pets: Number(booking?.pets) || 0,
      wellnessLineItems: Array.isArray(booking?.wellness_line_items)
        ? (booking!.wellness_line_items as { name: string; price: number }[])
        : [],
      feePercent,
      earlyCheckInFee: earlyFee,
      lateCheckOutFee: lateFee,
      applyCardFee: false,
    });

    if (quote) {
      platformFee = roundMoney(quote.platformFee);
      hostLodgingGross = roundMoney(
        quote.totalRent +
          quote.cleaningFee +
          quote.extraGuestCharges +
          quote.earlyCheckInFee +
          quote.lateCheckOutFee
      );
    }
  }

  if (hostLodgingGross <= 0 && nights > 0 && Number.isFinite(nightly) && nightly >= 0) {
    const lodging = computeLodgingWithBakedFee({
      hostNightlyRate: nightly,
      nights,
      hostCleaningFee: cleaning,
      feePercent,
    });
    platformFee = roundMoney(lodging.platformFee);
    hostLodgingGross = roundMoney(lodging.hostSubtotal);
  }

  if (hostLodgingGross <= 0 && guestTotal > 0) {
    hostLodgingGross = roundMoney(guestTotal * (100 / (100 + feePercent)));
    platformFee = roundMoney(guestTotal - hostLodgingGross);
  }

  const hostFee = guestTotal > 0 ? roundMoney(guestTotal * (hostFeePercent / 100)) : 0;
  const hostAmount = roundMoney(Math.max(0, hostLodgingGross - hostFee));

  return {
    guestTotal: guestTotal > 0 ? guestTotal : hostLodgingGross + platformFee,
    platformFee,
    hostFee,
    hostAmount,
    nights,
  };
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
  guests?: number | null;
  kids?: number | null;
  pets?: number | null;
  wellness_line_items?: unknown;
  early_check_in_requested?: boolean | null;
  late_check_out_requested?: boolean | null;
  selected_units?: Array<{ price?: unknown }> | null;
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
      'id, host_id, property_id, property_name, check_in, check_out, total_price, status, payment_status, guests, kids, pets, wellness_line_items, early_check_in_requested, late_check_out_requested, selected_units'
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

  let property: PayoutPropertyContext | null = null;
  if (row.property_id) {
    const { data: propertyRow } = await service
      .from('properties')
      .select(
        'price, cleaning_fee, guests, allow_extra_guests, extra_guest_price, check_in_time, check_out_time, early_check_in_allowed, earliest_early_check_in_time, early_check_in_fee, late_check_out_allowed, latest_late_check_out_time, late_check_out_fee'
      )
      .eq('id', row.property_id)
      .maybeSingle();
    property = propertyRow as PayoutPropertyContext | null;
  }

  const [serviceFeePercent, hostFeePercent] = await Promise.all([
    getServiceFeePercent(service),
    getHostFeePercent(service),
  ]);

  const amounts = computeHostPayoutAmounts({
    checkIn: row.check_in,
    checkOut: row.check_out,
    guestTotal: row.total_price,
    hostNightlyRate: property?.price != null ? Number(property.price) : null,
    hostCleaningFee:
      property?.cleaning_fee != null ? Number(property.cleaning_fee) || 0 : 0,
    feePercent: serviceFeePercent,
    hostFeePercent,
    booking: row,
    property,
  });

  const payload = {
    booking_id: bookingId,
    host_id: row.host_id,
    property_id: row.property_id || null,
    guest_total: amounts.guestTotal,
    platform_fee: amounts.platformFee,
    host_fee: amounts.hostFee,
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
