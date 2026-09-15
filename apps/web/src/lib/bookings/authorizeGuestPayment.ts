import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyBookingPayClaim } from '@/lib/bookings/payClaim';
import type { SupabaseClient } from '@supabase/supabase-js';

function isPayableBooking(status: string | null | undefined, paymentStatus: string | null | undefined) {
  const pay = String(paymentStatus || '').toLowerCase();
  const st = String(status || '').toLowerCase();
  return pay === 'pending' && (st === 'accepted' || st === 'pending_approval' || st === 'pending');
}

export async function authorizeGuestBookingPayment(
  bookingId: string,
  claim?: string | null
): Promise<{ userId: string; db: SupabaseClient } | null> {
  if (!bookingId) return null;

  const sessionClient = createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  const verified = verifyBookingPayClaim(claim, bookingId);

  if (user?.id && (!verified || user.id === verified.userId)) {
    return { userId: user.id, db: sessionClient };
  }

  if (verified) {
    return { userId: verified.userId, db: createServiceClient() };
  }

  // Email "Pay now" links include the booking id. Treat that as a capability URL so
  // a traveller already signed in elsewhere (or opening Gmail's in-app browser)
  // can complete payment without a second login.
  const service = createServiceClient();
  const { data: booking } = await service
    .from('bookings')
    .select('id, user_id, status, payment_status')
    .eq('id', bookingId)
    .maybeSingle();

  if (booking?.user_id && isPayableBooking(booking.status, booking.payment_status)) {
    return { userId: String(booking.user_id), db: service };
  }

  if (user?.id) {
    return { userId: user.id, db: sessionClient };
  }

  return null;
}
