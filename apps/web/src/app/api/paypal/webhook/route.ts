import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { formatPayPalAmount, verifyPayPalWebhookSignature } from '@/lib/paypal';

/**
 * PayPal webhooks: register LIVE URL in Developer Dashboard → Live app → Webhooks:
 *   POST https://<your-domain>/api/paypal/webhook
 * Set PAYPAL_WEBHOOK_ID to the webhook's ID for signature verification.
 */

type WebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    amount?: { value?: string };
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
  };
};

function getBookingIdFromCapture(resource: WebhookEvent['resource']): string | null {
  if (!resource) return null;
  if (resource.custom_id && typeof resource.custom_id === 'string') {
    return resource.custom_id;
  }
  return null;
}

async function markBookingPaid(bookingId: string, captureId: string, amountValue?: string) {
  const supabase = createServiceClient();

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(
      'id, host_id, payment_status, total_price, status, property_name, guest_name'
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (fetchError || !booking) {
    console.warn('[paypal/webhook] booking not found', bookingId, fetchError);
    return;
  }

  if (booking.payment_status === 'paid') {
    return;
  }

  if (booking.status !== 'accepted' && booking.status !== 'pending_approval') {
    console.warn('[paypal/webhook] booking not in payable state', bookingId, booking.status);
    return;
  }

  if (amountValue) {
    try {
      const expected = formatPayPalAmount(booking.total_price);
      if (amountValue !== expected) {
        console.error('[paypal/webhook] amount mismatch', amountValue, expected);
        return;
      }
    } catch {
      return;
    }
  }

  const nextStatus = booking.status === 'accepted' ? 'confirmed' : booking.status;

  const { data: updatedRows, error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      payment_intent_id: captureId,
      status: nextStatus,
    })
    .eq('id', bookingId)
    .eq('payment_status', 'pending')
    .select('id');

  if (updateError) {
    console.error('[paypal/webhook] update failed', updateError);
    return;
  }

  const transitioned = Array.isArray(updatedRows) && updatedRows.length > 0;

  if (transitioned && booking.host_id) {
    await supabase.from('notifications').insert({
      user_id: booking.host_id,
      type: 'payment_received',
      title: 'Payment received',
      message: `${booking.guest_name || 'A guest'} paid for ${booking.property_name}.`,
      related_booking_id: booking.id,
    });
  }
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (webhookId) {
    const ok = await verifyPayPalWebhookSignature({
      webhookId,
      transmissionId: request.headers.get('paypal-transmission-id'),
      transmissionTime: request.headers.get('paypal-transmission-time'),
      certUrl: request.headers.get('paypal-cert-url'),
      authAlgo: request.headers.get('paypal-auth-algo'),
      transmissionSig: request.headers.get('paypal-transmission-sig'),
      bodyText,
    });
    if (!ok) {
      console.error('[paypal/webhook] signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } else {
    console.warn(
      '[paypal/webhook] PAYPAL_WEBHOOK_ID not set — processing without verification (add webhook ID in production)'
    );
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(bodyText) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const resource = event.resource;
    const bookingId = getBookingIdFromCapture(resource);
    const captureId = resource?.id || '';
    const amountValue = resource?.amount?.value;

    if (bookingId && captureId) {
      await markBookingPaid(bookingId, captureId, amountValue);
    } else {
      console.warn('[paypal/webhook] missing booking or capture id', event);
    }
  }

  return NextResponse.json({ received: true });
}
