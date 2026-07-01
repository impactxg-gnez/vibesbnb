import type { SupabaseClient } from '@supabase/supabase-js';
import { formatCalendarDate, todayLocalYmd } from '@/lib/dateUtils';

/** Only fully confirmed (paid) stays count toward review eligibility. */
export const REVIEWABLE_BOOKING_STATUS = 'confirmed' as const;

export type ReviewEligibility = {
  eligible: boolean;
  hasReview: boolean;
  existingReview?: {
    id: string;
    status: string;
    rating: number;
    comment: string | null;
  };
  /** Set when the guest has a confirmed stay but checkout has not passed yet. */
  upcomingCheckout?: string | null;
  reason?: string;
};

export function isCheckoutComplete(checkOut: string, today = todayLocalYmd()): boolean {
  return checkOut <= today;
}

export function isPaidBooking(paymentStatus?: string | null): boolean {
  return !paymentStatus || paymentStatus === 'paid';
}

/** Client-side check for a single booking row (e.g. My Bookings page). */
export function isBookingEligibleForReview(booking: {
  status: string;
  checkOut?: string;
  check_out?: string;
  payment_status?: string | null;
}): boolean {
  const checkOut = booking.checkOut ?? booking.check_out ?? '';
  if (!checkOut) return false;
  if (booking.status !== REVIEWABLE_BOOKING_STATUS) return false;
  if (!isPaidBooking(booking.payment_status)) return false;
  return isCheckoutComplete(checkOut);
}

type BookingRow = {
  id: string;
  check_out: string;
  status: string;
  payment_status?: string | null;
};

function bookingQualifiesForReview(booking: BookingRow, today: string): boolean {
  return (
    booking.status === REVIEWABLE_BOOKING_STATUS &&
    isPaidBooking(booking.payment_status) &&
    isCheckoutComplete(booking.check_out, today)
  );
}

export async function getReviewEligibility(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string
): Promise<ReviewEligibility> {
  const { data: existing } = await supabase
    .from('reviews')
    .select('id, status, rating, comment')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (existing) {
    return {
      eligible: false,
      hasReview: true,
      existingReview: existing,
      reason:
        existing.status === 'pending'
          ? 'Your review is pending approval.'
          : existing.status === 'rejected'
            ? 'Your previous review was not approved.'
            : 'You have already reviewed this property.',
    };
  }

  const today = todayLocalYmd();
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, check_out, status, payment_status')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .eq('status', REVIEWABLE_BOOKING_STATUS)
    .order('check_out', { ascending: false });

  if (error) {
    console.error('[getReviewEligibility]', error);
    return {
      eligible: false,
      hasReview: false,
      reason: 'Could not verify booking eligibility.',
    };
  }

  const rows = (bookings ?? []) as BookingRow[];
  const completedStay = rows.find((b) => bookingQualifiesForReview(b, today));

  if (completedStay) {
    return { eligible: true, hasReview: false };
  }

  const upcomingStay = rows.find(
    (b) => isPaidBooking(b.payment_status) && b.check_out > today
  );

  if (upcomingStay) {
    return {
      eligible: false,
      hasReview: false,
      upcomingCheckout: upcomingStay.check_out,
      reason: `You can leave a review after checkout on ${formatCalendarDate(upcomingStay.check_out, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}.`,
    };
  }

  return {
    eligible: false,
    hasReview: false,
    reason: 'Book and complete a stay at this property before leaving a review.',
  };
}
