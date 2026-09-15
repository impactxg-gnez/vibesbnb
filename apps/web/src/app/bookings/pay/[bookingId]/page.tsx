import { redirect } from 'next/navigation';
import { authorizeGuestBookingPayment } from '@/lib/bookings/authorizeGuestPayment';
import { bookingPayPath } from '@/lib/bookings/payUrl';
import { loginUrlWithNext } from '@/lib/auth/safeReturnPath';
import { PayBookingClient, PayBookingNotFound, type PayBookingView } from './PayBookingClient';

export const dynamic = 'force-dynamic';

const BOOKING_PAY_COLUMNS = [
  'id',
  'property_id',
  'property_name',
  'property_image',
  'location',
  'check_in',
  'check_out',
  'guests',
  'kids',
  'pets',
  'total_price',
  'status',
  'payment_status',
].join(',');

function toView(row: Record<string, unknown>): PayBookingView {
  return {
    id: String(row.id),
    propertyId: String(row.property_id || ''),
    propertyName: String(row.property_name || 'Stay'),
    propertyImage: (row.property_image as string | null) || null,
    location: String(row.location || ''),
    checkIn: String(row.check_in || ''),
    checkOut: String(row.check_out || ''),
    guests: Number(row.guests) || 1,
    kids: Number(row.kids) || 0,
    pets: Number(row.pets) || 0,
    totalPrice: Number(row.total_price) || 0,
    status: String(row.status || ''),
    paymentStatus: String(row.payment_status || 'pending'),
  };
}

export default async function PayBookingPage({
  params,
  searchParams,
}: {
  params: { bookingId: string };
  searchParams?: { claim?: string };
}) {
  const bookingId = params.bookingId;
  const claim = typeof searchParams?.claim === 'string' ? searchParams.claim : '';
  const nextPath = loginUrlWithNext(bookingPayPath(bookingId, claim || null));

  const auth = await authorizeGuestBookingPayment(bookingId, claim);
  if (!auth) {
    redirect(nextPath);
    return null;
  }

  const { data, error } = await auth.db
    .from('bookings')
    .select(BOOKING_PAY_COLUMNS)
    .eq('id', bookingId)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (error || !data) {
    return <PayBookingNotFound />;
  }

  return (
    <PayBookingClient
      booking={toView(data as unknown as Record<string, unknown>)}
      claim={claim || null}
    />
  );
}
