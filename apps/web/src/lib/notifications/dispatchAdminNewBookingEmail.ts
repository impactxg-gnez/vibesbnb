import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listActiveAdminRecipients,
  sendEmailViaExistingEndpoint,
} from '@/lib/notifications/listActiveAdmins';

export type AdminNewBookingEmailParams = {
  service: SupabaseClient;
  appUrl: string;
  bookingId: string;
  propertyName: string;
  hostName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: string;
  paymentStatus?: string | null;
};

/**
 * Emails all active admins about a new booking (once per booking id).
 * Best-effort; never throws to callers.
 */
export async function dispatchAdminNewBookingEmail(
  params: AdminNewBookingEmailParams
): Promise<void> {
  try {
    const {
      service,
      appUrl,
      bookingId,
      propertyName,
      hostName,
      guestName,
      checkIn,
      checkOut,
      guests,
      totalPrice,
      status,
      paymentStatus,
    } = params;

    // Idempotent claim (same pattern as invoice_sent_at)
    const { data: claimed, error: claimErr } = await service
      .from('bookings')
      .update({ admin_new_booking_emailed_at: new Date().toISOString() })
      .eq('id', bookingId)
      .is('admin_new_booking_emailed_at', null)
      .select('id');

    if (claimErr) {
      console.warn('[dispatchAdminNewBookingEmail] claim:', claimErr.message);
      return;
    }
    if (!claimed?.length) {
      return;
    }

    const admins = await listActiveAdminRecipients(service);
    if (admins.length === 0) {
      console.warn('[dispatchAdminNewBookingEmail] no active admin recipients');
      return;
    }

    const base = appUrl.replace(/\/$/, '');
    const adminBookingUrl = `${base}/admin/reservations?bookingId=${encodeURIComponent(bookingId)}`;
    const subject = `New booking — ${propertyName || 'listing'}`;

    await Promise.all(
      admins.map((admin) =>
        sendEmailViaExistingEndpoint(base, {
          to: admin.email,
          subject,
          template: 'admin_new_booking',
          data: {
            bookingId,
            propertyName: propertyName || 'Listing',
            hostName: hostName || 'Host',
            guestName: guestName || 'Guest',
            checkIn,
            checkOut,
            guests,
            totalPrice,
            status: status || 'pending',
            paymentStatus: paymentStatus || 'pending',
            adminBookingUrl,
            recipientName: admin.name,
          },
        })
      )
    );
  } catch (e) {
    console.warn('[dispatchAdminNewBookingEmail]', e);
  }
}
