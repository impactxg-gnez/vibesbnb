import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  capturePayPalOrder,
  formatPayPalAmount,
  getPayPalOrder,
} from '@/lib/paypal';

function extractCaptureMeta(result: Awaited<ReturnType<typeof capturePayPalOrder>>): {
  captureId: string;
  customId: string | undefined;
  capturedAmount: string | undefined;
} {
  const unit = result.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    captureId: capture?.id || result.id,
    customId: (unit as { custom_id?: string } | undefined)?.custom_id,
    capturedAmount: capture?.amount?.value,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderID = typeof body.orderID === 'string' ? body.orderID : '';
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId : '';

    if (!orderID || !bookingId) {
      return NextResponse.json(
        { error: 'orderID and bookingId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        'id, user_id, host_id, status, payment_status, total_price, property_name, guest_name'
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (booking.status !== 'accepted' || booking.payment_status !== 'pending') {
      return NextResponse.json(
        { error: 'Booking is not awaiting payment' },
        { status: 400 }
      );
    }

    let capture: Awaited<ReturnType<typeof capturePayPalOrder>>;
    try {
      capture = await capturePayPalOrder(orderID);
    } catch (captureErr) {
      const order = await getPayPalOrder(orderID);
      if (order.status === 'COMPLETED') {
        capture = order;
      } else {
        throw captureErr;
      }
    }

    if (capture.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Payment not completed (status: ${capture.status})` },
        { status: 400 }
      );
    }

    const { captureId, customId, capturedAmount } = extractCaptureMeta(capture);
    if (customId && customId !== booking.id) {
      console.error('[paypal/capture-order] custom_id mismatch', customId, booking.id);
      return NextResponse.json({ error: 'Order does not match this booking' }, { status: 400 });
    }

    const expected = formatPayPalAmount(booking.total_price);
    if (capturedAmount && capturedAmount !== expected) {
      console.error('[paypal/capture-order] amount mismatch', capturedAmount, expected);
      return NextResponse.json({ error: 'Captured amount does not match booking total' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_intent_id: captureId,
        status: 'confirmed',
      })
      .eq('id', bookingId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[paypal/capture-order] supabase update', updateError);
      return NextResponse.json(
        { error: 'Payment captured but failed to update booking. Support will reconcile.' },
        { status: 500 }
      );
    }

    if (booking.host_id) {
      await supabase.from('notifications').insert({
        user_id: booking.host_id,
        type: 'payment_received',
        title: 'Payment received',
        message: `${booking.guest_name || 'A guest'} paid for ${booking.property_name}.`,
        related_booking_id: booking.id,
      });
    }

    return NextResponse.json({ success: true, captureId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to capture payment';
    console.error('[paypal/capture-order]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
