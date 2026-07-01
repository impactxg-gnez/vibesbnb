import type { SupabaseClient } from '@supabase/supabase-js';
import { releaseBookingAvailability } from '@/lib/bookingAvailability';
import { dispatchPushToUser } from '@/lib/pushDispatch';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';

export type RejectBookingResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function processBookingReject(params: {
  bookingId: string;
  reason: string;
  actorUserId: string;
  isAdmin?: boolean;
  requestOrigin: string;
  supabase: SupabaseClient;
  serviceSupabase: SupabaseClient;
}): Promise<RejectBookingResult> {
  const {
    bookingId,
    reason,
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

  const writeClient = isAdmin ? serviceSupabase : supabase;
  let updateQuery = writeClient
    .from('bookings')
    .update({
      status: 'rejected',
      host_rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', bookingId);

  if (!isAdmin) {
    updateQuery = updateQuery.eq('host_id', actorUserId);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    console.error('Error updating booking:', updateError);
    return { ok: false, error: 'Failed to reject booking', status: 500 };
  }

  try {
    await releaseBookingAvailability(serviceSupabase, bookingId);
  } catch (e) {
    console.warn('Failed to release calendar holds for rejected booking:', e);
  }

  void invalidatePropertyListingCaches(String(booking.property_id));

  await supabase.from('notifications').insert({
    user_id: booking.user_id,
    type: 'booking_rejected',
    title: 'Booking Declined',
    message: `Your booking request for ${booking.property_name} has been declined. Reason: ${reason}`,
    related_booking_id: booking.id,
  });

  if (booking.guest_email) {
    let hostName = 'The Host';
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;
    try {
      await fetch(`${appUrl}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: booking.guest_email,
          subject: `Booking Declined: ${booking.property_name}`,
          template: 'booking_rejected',
          data: {
            propertyName: booking.property_name,
            hostName,
            checkIn: booking.check_in,
            checkOut: booking.check_out,
            reason,
            bookingId: booking.id,
          },
        }),
      });
    } catch (emailError) {
      console.warn('Failed to send email notification:', emailError);
    }
  }

  await dispatchPushToUser(
    booking.user_id,
    'Booking request declined',
    `The host declined your request for ${booking.property_name}.`,
    { stage: 'booking_rejected', bookingId: booking.id }
  );

  return { ok: true };
}
