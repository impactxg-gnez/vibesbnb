import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, checkIn, checkOut } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Booking is not pending approval' },
        { status: 400 }
      );
    }

    if (booking.host_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this booking' },
        { status: 403 }
      );
    }

    const finalCheckIn = checkIn != null && String(checkIn).length >= 8 ? ymd(checkIn) : ymd(booking.check_in);
    const finalCheckOut =
      checkOut != null && String(checkOut).length >= 8 ? ymd(checkOut) : ymd(booking.check_out);

    const serviceSupabase = createServiceClient();

    const { data: propertyRow, error: propertyError } = await serviceSupabase
      .from('properties')
      .select(
        'min_booking_nights, price, cleaning_fee, guests, allow_extra_guests, extra_guest_price, refundable_deposit, allow_direct_booking'
      )
      .eq('id', booking.property_id)
      .single();

    if (propertyError || !propertyRow) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const stayNights = nightsBetweenYmd(finalCheckIn, finalCheckOut);
    if (stayNights <= 0) {
      return NextResponse.json(
        { error: 'Invalid check-in and check-out dates' },
        { status: 400 }
      );
    }

    const minStay = normalizeMinBookingNights(propertyRow.min_booking_nights);
    if (minStay != null && stayNights < minStay) {
      return NextResponse.json(
        {
          error: `This property requires a minimum stay of ${minStay} night${minStay === 1 ? '' : 's'}.`,
        },
        { status: 400 }
      );
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
      return NextResponse.json({ error: conflict.message }, { status: 409 });
    }

    await releaseBookingAvailability(serviceSupabase, bookingId);

    const alreadyPaid = booking.payment_status === 'paid';
    const nextStatus = alreadyPaid ? 'confirmed' : 'accepted';

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: nextStatus,
        check_in: finalCheckIn,
        check_out: finalCheckOut,
        total_price: newTotal,
        host_approved_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('host_id', user.id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept booking', details: updateError.message },
        { status: 500 }
      );
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
      const { data: hostProfile } = await supabase
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

    if (alreadyPaid) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
        request.nextUrl.origin;
      void dispatchBookingConfirmedEmails(
        serviceSupabase,
        bookingId,
        appUrl
      );
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
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        await fetch(`${appUrl}/api/notifications/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: booking.guest_email,
            subject: `Complete payment: ${booking.property_name}`,
            template: 'booking_accepted',
            data: {
              propertyName: booking.property_name,
              hostName: hostName,
              checkIn: finalCheckIn,
              checkOut: finalCheckOut,
              guests: booking.guests,
              totalPrice: newTotal,
              bookingId: booking.id,
              location: booking.location,
            },
          }),
        });
      } catch (emailError) {
        console.warn('Failed to send email notification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking accepted successfully',
      check_in: finalCheckIn,
      check_out: finalCheckOut,
      total_price: newTotal,
    });
  } catch (error: any) {
    console.error('Error accepting booking:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
