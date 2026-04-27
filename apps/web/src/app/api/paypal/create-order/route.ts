import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPayPalOrder, formatPayPalAmount } from '@/lib/paypal';

const DEFAULT_CURRENCY = 'USD';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId : '';

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
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
        'id, user_id, status, payment_status, total_price, property_name'
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const canPay =
      booking.payment_status === 'pending' &&
      (booking.status === 'pending_approval' || booking.status === 'accepted');

    if (!canPay) {
      return NextResponse.json(
        {
          error:
            'This booking cannot be paid: it must be awaiting approval or accepted with payment pending.',
        },
        { status: 400 }
      );
    }

    const amountValue = formatPayPalAmount(booking.total_price);
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    ).replace(/\/$/, '');
    const returnUrl = `${appUrl}/bookings`;
    const cancelUrl = `${appUrl}/bookings`;

    const order = await createPayPalOrder({
      bookingId: booking.id,
      amountValue,
      currencyCode: DEFAULT_CURRENCY,
      propertyName: booking.property_name || 'Stay',
      returnUrl,
      cancelUrl,
    });

    return NextResponse.json({ id: order.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create PayPal order';
    console.error('[paypal/create-order]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
