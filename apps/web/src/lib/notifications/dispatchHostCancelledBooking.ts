import type { SupabaseClient } from '@supabase/supabase-js';
import {
  resolveUserContact,
  normalizeWhatsAppNumber,
} from '@/lib/notifications/resolveUserContact';
import { dispatchPushToUser } from '@/lib/pushDispatch';

type BookingRow = {
  id: string;
  user_id: string;
  property_name?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  host_id?: string | null;
};

/**
 * Notify traveller when the host cancels a booking (in-app, email, WhatsApp, push).
 */
export async function dispatchHostCancelledBooking(
  service: SupabaseClient,
  booking: BookingRow,
  reason: string,
  hostName: string,
  appUrl: string
): Promise<void> {
  const propertyName = booking.property_name || 'your stay';
  const message = `The host cancelled your booking for ${propertyName}. Reason: ${reason}`;

  try {
    await service.from('notifications').insert({
      user_id: booking.user_id,
      type: 'booking_cancelled',
      title: 'Booking cancelled by host',
      message,
      related_booking_id: booking.id,
    });
  } catch (e) {
    console.warn('[dispatchHostCancelledBooking] in-app notification:', e);
  }

  const guestEmail =
    booking.guest_email?.trim() ||
    (await resolveUserContact(service, booking.user_id)).email;

  if (guestEmail) {
    try {
      await fetch(`${appUrl}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: guestEmail,
          subject: `Booking cancelled: ${propertyName}`,
          template: 'booking_cancelled_by_host',
          data: {
            propertyName,
            hostName,
            guestName: booking.guest_name || 'Guest',
            checkIn: booking.check_in,
            checkOut: booking.check_out,
            reason,
            bookingsUrl: `${appUrl.replace(/\/$/, '')}/bookings`,
          },
        }),
      });
    } catch (e) {
      console.warn('[dispatchHostCancelledBooking] email:', e);
    }
  }

  const contact = await resolveUserContact(service, booking.user_id);
  const whatsapp = contact.whatsapp ? normalizeWhatsAppNumber(contact.whatsapp) : null;
  if (whatsapp) {
    try {
      await fetch(`${appUrl}/api/notifications/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: whatsapp,
          message: [
            `⚠️ Booking cancelled by host`,
            ``,
            `Property: ${propertyName}`,
            `Dates: ${booking.check_in} → ${booking.check_out}`,
            ``,
            `Reason: ${reason}`,
            ``,
            `View details: ${appUrl.replace(/\/$/, '')}/bookings`,
          ].join('\n'),
        }),
      });
    } catch (e) {
      console.warn('[dispatchHostCancelledBooking] whatsapp:', e);
    }
  }

  await dispatchPushToUser(
    booking.user_id,
    'Booking cancelled',
    message.slice(0, 120),
    { stage: 'booking_rejected', bookingId: booking.id }
  );
}
