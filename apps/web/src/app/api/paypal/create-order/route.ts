import { NextRequest, NextResponse } from 'next/server';
import { createPayPalOrder, formatPayPalAmount } from '@/lib/paypal';
import { authorizeGuestBookingPayment } from '@/lib/bookings/authorizeGuestPayment';
import { bookingPayPath } from '@/lib/bookings/payUrl';

const DEFAULT_CURRENCY = 'USD';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId : '';
    const claim = typeof body.claim === 'string' ? body.claim : '';

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const auth = await authorizeGuestBookingPayment(bookingId, claim);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: booking, error: bookingError } = await auth.db
      .from('bookings')
      .select(
        'id, user_id, status, payment_status, total_price, property_name'
      )
      .eq('id', bookingId)
      .eq('user_id', auth.userId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== auth.userId) {
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
    const payPath = bookingPayPath(booking.id, claim || null);
    const returnUrl = `${appUrl}${payPath}`;
    const cancelUrl = `${appUrl}${payPath}`;

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
