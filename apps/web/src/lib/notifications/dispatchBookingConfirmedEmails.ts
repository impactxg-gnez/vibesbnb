import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildBookingInvoiceContext,
  type BookingInvoiceContext,
} from '@/lib/email/bookingInvoiceEmail';
import { resolveUserContact } from '@/lib/notifications/resolveUserContact';

/**
 * Sends VibesBNB-themed booking confirmation + invoice to traveller and host (once per paid booking).
 */
export async function dispatchBookingConfirmedEmails(
  service: SupabaseClient,
  bookingId: string,
  appUrl: string
): Promise<void> {
  const { data: claimed, error: claimErr } = await service
    .from('bookings')
    .update({ invoice_sent_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('payment_status', 'paid')
    .is('invoice_sent_at', null)
    .select('id');

  if (claimErr) {
    console.warn('[dispatchBookingConfirmedEmails] claim:', claimErr.message);
    return;
  }
  if (!claimed?.length) {
    return;
  }

  const { data: booking, error: bookingErr } = await service
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    console.warn('[dispatchBookingConfirmedEmails] booking load:', bookingErr?.message);
    return;
  }

  const propertyId = booking.property_id as string | undefined;
  let property: Record<string, unknown> | null = null;
  if (propertyId) {
    const { data: prop } = await service
      .from('properties')
      .select('id, name, location, price, cleaning_fee, google_maps_url, host_id')
      .eq('id', propertyId)
      .maybeSingle();
    property = prop as Record<string, unknown> | null;
  }

  const hostId = String(booking.host_id || property?.host_id || '');
  const hostContact = hostId
    ? await resolveUserContact(service, hostId)
    : { email: null, whatsapp: null, name: 'Host' };

  const hostPhone = hostContact.whatsapp;

  let payoutAccount: Record<string, unknown> | null = null;
  if (hostId) {
    const { data: payout } = await service
      .from('payout_accounts')
      .select('account_holder_name, bank_name, currency, status')
      .eq('user_id', hostId)
      .maybeSingle();
    payoutAccount = payout as Record<string, unknown> | null;
  }

  const ctx = buildBookingInvoiceContext({
    booking: booking as Record<string, unknown>,
    property,
    hostContact: {
      name: hostContact.name,
      email:
        (booking.host_email as string) ||
        hostContact.email ||
        null,
      phone: hostPhone,
      whatsapp: hostPhone,
    },
    payoutAccount,
  });

  const base = appUrl.replace(/\/$/, '');
  const travellerEmail =
    (booking.guest_email as string)?.trim() || (await resolveUserContact(service, booking.user_id as string)).email;
  const hostEmail =
    (booking.host_email as string)?.trim() || hostContact.email;

  await sendInvoiceEmail(base, 'booking_invoice_traveller', travellerEmail, ctx, booking.property_name);
  await sendInvoiceEmail(base, 'booking_invoice_host', hostEmail, ctx, booking.property_name);

  try {
    await service.from('notifications').insert({
      user_id: booking.user_id,
      type: 'booking_confirmed',
      title: 'Booking confirmed',
      message: `Your stay at ${booking.property_name} is confirmed. Check your email for your invoice and host contact details.`,
      related_booking_id: booking.id,
    });
  } catch (e) {
    console.warn('[dispatchBookingConfirmedEmails] traveller notification:', e);
  }
}

async function sendInvoiceEmail(
  appUrl: string,
  template: string,
  to: string | null | undefined,
  ctx: BookingInvoiceContext,
  propertyName: unknown
): Promise<void> {
  if (!to) return;
  try {
    const response = await fetch(`${appUrl}/api/notifications/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject:
          template === 'booking_invoice_traveller'
            ? `Booking confirmed & invoice — ${propertyName || 'your stay'}`
            : `Payment received — ${propertyName || 'your property'} — payout details`,
        template,
        data: { ...ctx, appUrl },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn(`[dispatchBookingConfirmedEmails] ${template}:`, err);
    }
  } catch (e) {
    console.warn(`[dispatchBookingConfirmedEmails] ${template} failed:`, e);
  }
}
