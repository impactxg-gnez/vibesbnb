import type { SupabaseClient } from '@supabase/supabase-js';
import { nightsBetweenYmd } from '@/lib/dateUtils';
import { normalizeMinBookingNights } from '@/lib/minBookingNights';
import { computeBookingGrandTotal } from '@/lib/bookingTotals';
import {
  assertStayDoesNotConflict,
  blockBookingNights,
  releaseBookingAvailability,
} from '@/lib/bookingAvailability';
import { dispatchPushToUser } from '@/lib/pushDispatch';
import { dispatchBookingConfirmedEmails } from '@/lib/notifications/dispatchBookingConfirmedEmails';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

function ymd(d: string): string {
  return String(d).slice(0, 10);
}

export function bookingPayUrl(appUrl: string, bookingId: string): string {
  const base = appUrl.replace(/\/$/, '');
  return `${base}/bookings?pay=${encodeURIComponent(bookingId)}`;
}

export type AcceptBookingResult =
  | {
      ok: true;
      check_in: string;
      check_out: string;
      total_price: number;
      status: string;
    }
  | { ok: false; error: string; status: number };

export async function processBookingAccept(params: {
  bookingId: string;
  checkIn?: string;
  checkOut?: string;
  actorUserId: string;
  isAdmin?: boolean;
  requestOrigin: string;
  supabase: SupabaseClient;
  serviceSupabase: SupabaseClient;
}): Promise<AcceptBookingResult> {
  const {
    bookingId,
    checkIn,
    checkOut,
    actorUserId,
    isAdmin = false,
    requestOrigin,
    supabase,
    serviceSupabase,
  } = params;

  const readClient = isAdmin ? serviceSupabase : supabase;
  const { data: booking, error: bookingError } = await readClient
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return { ok: false, error: 'Booking not found', status: 404 };
  }

  if (booking.status !== 'pending_approval') {
    return { ok: false, error: 'Booking is not pending approval', status: 400 };
  }

  if (!isAdmin && booking.host_id !== actorUserId) {
    return { ok: false, error: 'You do not have permission to manage this booking', status: 403 };
  }

  const finalCheckIn =
    checkIn != null && String(checkIn).length >= 8 ? ymd(checkIn) : ymd(booking.check_in);
  const finalCheckOut =
    checkOut != null && String(checkOut).length >= 8 ? ymd(checkOut) : ymd(booking.check_out);

  const { data: propertyRow, error: propertyError } = await serviceSupabase
    .from('properties')
    .select(
      'min_booking_nights, price, cleaning_fee, guests, allow_extra_guests, extra_guest_price, refundable_deposit, allow_direct_booking'
    )
    .eq('id', booking.property_id)
    .single();

  if (propertyError || !propertyRow) {
    return { ok: false, error: 'Property not found', status: 404 };
  }

  const stayNights = nightsBetweenYmd(finalCheckIn, finalCheckOut);
  if (stayNights <= 0) {
    return { ok: false, error: 'Invalid check-in and check-out dates', status: 400 };
  }

  const minStay = normalizeMinBookingNights(propertyRow.min_booking_nights);
  if (minStay != null && stayNights < minStay) {
    return {
      ok: false,
      error: `This property requires a minimum stay of ${minStay} night${minStay === 1 ? '' : 's'}.`,
      status: 400,
    };
  }

  const wellnessRaw = Array.isArray(booking.wellness_line_items) ? booking.wellness_line_items : [];
  const wellnessLineItems = wellnessRaw
    .filter(
      (row: unknown) =>
        row &&
        typeof row === 'object' &&
        typeof (row as { price?: unknown }).price !== 'undefined'
    )
    .map((row: Record<string, unknown>) => ({
      price: Math.max(0, Number(row.price) || 0),
    }));

  const cleaning = propertyRow.cleaning_fee != null ? Number(propertyRow.cleaning_fee) : 0;
  const { grandTotal: newTotal } = computeBookingGrandTotal({
    propertyNightlyPrice: Number(propertyRow.price) || 0,
    cleaningFee: cleaning,
    checkInYmd: finalCheckIn,
    checkOutYmd: finalCheckOut,
    selectedUnits: booking.selected_units,
    wellnessLineItems,
    includedGuests: Number(propertyRow.guests) || 1,
    adults: Number(booking.guests) || 1,
    kids: booking.kids != null ? Number(booking.kids) : 0,
    pets: booking.pets != null ? Number(booking.pets) : 0,
    allowExtraGuests: propertyRow.allow_extra_guests === true,
    extraGuestPrice:
      propertyRow.extra_guest_price != null ? Number(propertyRow.extra_guest_price) : 0,
    refundableDeposit:
      propertyRow.refundable_deposit != null ? Number(propertyRow.refundable_deposit) : 0,
    applyCardFee: propertyRow.allow_direct_booking === true,
  });

  const conflict = await assertStayDoesNotConflict(serviceSupabase, {
    propertyId: String(booking.property_id),
    bookingId: String(booking.id),
    checkInYmd: finalCheckIn,
    checkOutYmd: finalCheckOut,
    selectedUnits: booking.selected_units,
  });
  if (!conflict.ok) {
    return { ok: false, error: conflict.message, status: 409 };
  }

  await releaseBookingAvailability(serviceSupabase, bookingId);

  const alreadyPaid = booking.payment_status === 'paid';
  const nextStatus = alreadyPaid ? 'confirmed' : 'accepted';

  const writeClient = isAdmin ? serviceSupabase : supabase;
  let updateQuery = writeClient
    .from('bookings')
    .update({
      status: nextStatus,
      check_in: finalCheckIn,
      check_out: finalCheckOut,
      total_price: newTotal,
      host_approved_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (!isAdmin) {
    updateQuery = updateQuery.eq('host_id', actorUserId);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    console.error('Error updating booking:', updateError);
    return { ok: false, error: 'Failed to accept booking', status: 500 };
  }

  await blockBookingNights(serviceSupabase, {
    propertyId: String(booking.property_id),
    hostId: String(booking.host_id),
    bookingId: String(booking.id),
    checkInYmd: finalCheckIn,
    checkOutYmd: finalCheckOut,
    selectedUnits: booking.selected_units,
  });

  void invalidatePropertyListingCaches(String(booking.property_id));

  let hostName = 'Your Host';
  try {
    const { data: hostProfile } = await serviceSupabase
      .from('profiles')
      .select('full_name')
      .eq('id', booking.host_id)
      .single();
    if (hostProfile?.full_name) {
      hostName = hostProfile.full_name;
    }
  } catch (e) {
    console.warn('Could not fetch host name:', e);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || requestOrigin;

  if (alreadyPaid) {
    void dispatchBookingConfirmedEmails(serviceSupabase, bookingId, appUrl);
  }

  await dispatchPushToUser(
    booking.user_id,
    alreadyPaid ? 'Booking confirmed' : 'Booking accepted',
    alreadyPaid
      ? `Your stay at ${booking.property_name} is confirmed.`
      : `${hostName} accepted your request. Complete payment for ${booking.property_name}.`,
    {
      stage: alreadyPaid ? 'booking_confirmed' : 'booking_accepted',
      bookingId: booking.id,
    }
  );

  if (booking.guest_email && !alreadyPaid) {
    try {
      await fetch(`${appUrl}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: booking.guest_email,
          subject: `Complete payment: ${booking.property_name}`,
          template: 'booking_accepted',
          data: {
            propertyName: booking.property_name,
            hostName,
            checkIn: finalCheckIn,
            checkOut: finalCheckOut,
            guests: booking.guests,
            totalPrice: newTotal,
            bookingId: booking.id,
            location: booking.location,
            payUrl: bookingPayUrl(appUrl, booking.id),
          },
        }),
      });
    } catch (emailError) {
      console.warn('Failed to send email notification:', emailError);
    }
  }

  return {
    ok: true,
    check_in: finalCheckIn,
    check_out: finalCheckOut,
    total_price: newTotal,
    status: nextStatus,
  };
}
