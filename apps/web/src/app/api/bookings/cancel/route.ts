import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { releaseBookingAvailability } from '@/lib/bookingAvailability';
import { dispatchHostCancelledBooking } from '@/lib/notifications/dispatchHostCancelledBooking';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';
import { cancelHostPayoutForBooking } from '@/lib/hostPayouts';
import {
  normalizeCancellationPolicy,
  resolveRefund,
} from '@/lib/cancellationPolicy';
import { nightsBetweenYmd } from '@/lib/dateUtils';

const HOST_CANCELLABLE = new Set([
  'pending_approval',
  'pending',
  'accepted',
  'confirmed',
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bookingId = body?.bookingId as string | undefined;
    const reason =
      typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const isGuest = booking.user_id === user.id;
    const isHost = booking.host_id === user.id;

    if (!isGuest && !isHost) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (['cancelled', 'rejected'].includes(String(booking.status))) {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    if (isHost) {
      if (!reason) {
        return NextResponse.json(
          { error: 'Cancellation reason is required' },
          { status: 400 }
        );
      }
      if (!HOST_CANCELLABLE.has(String(booking.status))) {
        return NextResponse.json(
          { error: 'This booking cannot be cancelled in its current state' },
          { status: 400 }
        );
      }
    }

    let policy = normalizeCancellationPolicy(booking.cancellation_policy);
    if (!booking.cancellation_policy && booking.property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('cancellation_policy')
        .eq('id', booking.property_id)
        .maybeSingle();
      policy = normalizeCancellationPolicy(prop?.cancellation_policy);
    }

    const checkIn = String(booking.check_in || '');
    const checkOut = String(booking.check_out || '');
    let nights = 1;
    try {
      nights = Math.max(1, nightsBetweenYmd(checkIn, checkOut));
    } catch {
      nights = Math.max(1, Number(booking.nights) || 1);
    }

    const totalPaid =
      booking.payment_status === 'paid' || booking.payment_status === 'refunded'
        ? Number(booking.total_price) || 0
        : Number(booking.total_price) || 0;

    const refund = resolveRefund({
      policy,
      nights,
      checkInYmd: checkIn,
      bookedAt: booking.created_at || new Date().toISOString(),
      cancelledAt: new Date().toISOString(),
      totalPaid: booking.payment_status === 'paid' ? totalPaid : 0,
      cancelledBy: isHost ? 'host' : 'guest',
      priorPaymentStatus: booking.payment_status,
    });

    const newPaymentStatus =
      booking.payment_status === 'paid'
        ? refund.paymentStatus === 'refunded'
          ? 'refunded'
          : 'paid'
        : booking.payment_status;

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: newPaymentStatus,
        cancellation_reason: reason || null,
        cancelled_by: isHost ? 'host' : 'guest',
        cancelled_at: new Date().toISOString(),
        cancellation_policy: policy,
        refund_amount: refund.refundAmount,
        refund_percent: refund.refundPercent,
        refund_summary: refund.refundSummary,
      })
      .eq('id', bookingId);

    if (updateError) {
      throw updateError;
    }

    const service = createServiceClient();
    if (booking.payment_status === 'paid' || newPaymentStatus === 'refunded') {
      void cancelHostPayoutForBooking(service, bookingId, reason || undefined).then(
        (result) => {
          if (!result.ok) {
            console.warn('[bookings/cancel] host payout ledger:', result.error);
          }
        }
      );
    }

    try {
      await releaseBookingAvailability(service, bookingId);
    } catch (availabilityError) {
      console.warn('Failed to release availability:', availabilityError);
    }

    void invalidatePropertyListingCaches(String(booking.property_id));

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      request.nextUrl.origin;

    if (isHost) {
      let hostName = 'Your host';
      try {
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', booking.host_id)
          .maybeSingle();
        if (hostProfile?.full_name) hostName = hostProfile.full_name;
      } catch {
        /* optional */
      }

      void dispatchHostCancelledBooking(
        createServiceClient(),
        booking,
        reason,
        hostName,
        appUrl
      );
    } else if (booking.host_id) {
      await supabase.from('notifications').insert({
        user_id: booking.host_id,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `${booking.guest_name || 'Guest'} cancelled their booking for ${
          booking.property_name || 'your property'
        }.`,
        related_booking_id: booking.id,
      });
    }

    return NextResponse.json({
      success: true,
      refund: {
        amount: refund.refundAmount,
        percent: refund.refundPercent,
        summary: refund.refundSummary,
        paymentStatus: newPaymentStatus,
      },
    });
  } catch (error: unknown) {
    console.error('Error cancelling booking:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel booking';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
