'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, CheckCircle2, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { formatCalendarDate } from '@/lib/dateUtils';
import { PayPalBookingButtons } from '@/components/payments/PayPalBookingButtons';
import { bookingPayPath } from '@/lib/bookings/payUrl';
import { loginUrlWithNext } from '@/lib/auth/safeReturnPath';

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

type PayBooking = {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyImage: string | null;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  kids: number;
  pets: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
};

function canPayBooking(booking: PayBooking): boolean {
  return (
    booking.paymentStatus === 'pending' &&
    (booking.status === 'accepted' || booking.status === 'pending_approval')
  );
}

export default function PayBookingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : '';
  const [booking, setBooking] = useState<PayBooking | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (authLoading) return;
    if (!bookingId) return;
    if (!user) {
      router.replace(loginUrlWithNext(bookingPayPath(bookingId)));
    }
  }, [user, authLoading, router, bookingId]);

  useEffect(() => {
    if (!user || !bookingId) return;
    let cancelled = false;

    const load = async () => {
      setLoadState('loading');
      try {
        const supabase = createClient();
        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();

        if (supabaseUser) {
          const { data, error } = await supabase
            .from('bookings')
            .select(BOOKING_PAY_COLUMNS)
            .eq('id', bookingId)
            .eq('user_id', supabaseUser.id)
            .maybeSingle();

          if (cancelled) return;
          if (!error && data) {
            setBooking({
              id: data.id,
              propertyId: data.property_id,
              propertyName: data.property_name,
              propertyImage: data.property_image,
              location: data.location,
              checkIn: data.check_in,
              checkOut: data.check_out,
              guests: data.guests,
              kids: data.kids || 0,
              pets: data.pets || 0,
              totalPrice: Number(data.total_price) || 0,
              status: data.status,
              paymentStatus: data.payment_status || 'pending',
            });
            setLoadState('ready');
            return;
          }
        }

        const savedBookings = localStorage.getItem(`bookings_${user.id}`);
        if (savedBookings) {
          const parsed = JSON.parse(savedBookings) as Array<Record<string, unknown>>;
          const match = parsed.find((row) => String(row.id) === bookingId);
          if (match && !cancelled) {
            setBooking({
              id: String(match.id),
              propertyId: String(match.propertyId || match.property_id || ''),
              propertyName: String(match.propertyName || match.property_name || 'Stay'),
              propertyImage: (match.propertyImage || match.property_image || null) as string | null,
              location: String(match.location || ''),
              checkIn: String(match.checkIn || match.check_in || ''),
              checkOut: String(match.checkOut || match.check_out || ''),
              guests: Number(match.guests) || 1,
              kids: Number(match.kids) || 0,
              pets: Number(match.pets) || 0,
              totalPrice: Number(match.totalPrice ?? match.total_price) || 0,
              status: String(match.status || ''),
              paymentStatus: String(match.payment_status || match.paymentStatus || 'pending'),
            });
            setLoadState('ready');
            return;
          }
        }

        if (!cancelled) {
          setBooking(null);
          setLoadState('missing');
        }
      } catch {
        if (!cancelled) {
          setBooking(null);
          setLoadState('missing');
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, bookingId]);

  const formatDate = (value: string) =>
    formatCalendarDate(value, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (authLoading || !user || (user && loadState === 'loading')) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading your booking…</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === 'missing' || !booking) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-3">Booking not found</h1>
          <p className="text-gray-400 mb-8">
            This payment link may have expired, or it belongs to a different account.
          </p>
          <Link href="/bookings" className="btn-primary inline-block">
            View my bookings
          </Link>
        </div>
      </div>
    );
  }

  const paid = booking.paymentStatus === 'paid' || booking.status === 'confirmed';
  const payable = canPayBooking(booking);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto">
          {paid ? (
            <div className="text-center mb-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Stay confirmed</h1>
              <p className="text-gray-400">Payment is complete. You are all set for this trip.</p>
            </div>
          ) : (
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 text-emerald-400">Complete your booking</h1>
              <p className="text-gray-400">
                Your host approved these dates. Pay with PayPal to confirm your stay.
              </p>
            </div>
          )}

          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-emerald-500/30">
            {booking.propertyImage ? (
              <div className="relative w-full h-48">
                <Image
                  src={booking.propertyImage}
                  alt={booking.propertyName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Property</p>
                <Link
                  href={`/listings/${booking.propertyId}`}
                  className="text-xl font-semibold hover:text-emerald-400 transition"
                >
                  {booking.propertyName}
                </Link>
              </div>
              {booking.location ? (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                  {booking.location}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs">Check-in</p>
                    <p className="font-medium">{formatDate(booking.checkIn)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs">Check-out</p>
                    <p className="font-medium">{formatDate(booking.checkOut)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-500" />
                <span>
                  {booking.guests} guest{booking.guests === 1 ? '' : 's'}
                  {booking.kids ? ` · ${booking.kids} kid${booking.kids === 1 ? '' : 's'}` : ''}
                  {booking.pets ? ` · ${booking.pets} pet${booking.pets === 1 ? '' : 's'}` : ''}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-3 border-t border-emerald-500/20">
                <span className="font-semibold text-emerald-100">Amount due</span>
                <span className="text-2xl font-bold text-emerald-400">
                  ${booking.totalPrice.toFixed(2)}
                </span>
              </div>

              {payable ? (
                <div className="pt-2">
                  <PayPalBookingButtons
                    bookingId={booking.id}
                    onPaid={() => {
                      setBooking((prev) =>
                        prev
                          ? { ...prev, paymentStatus: 'paid', status: 'confirmed' }
                          : prev
                      );
                    }}
                  />
                </div>
              ) : paid ? (
                <Link href="/bookings" className="btn-primary w-full text-center block">
                  View my bookings
                </Link>
              ) : (
                <p className="text-sm text-yellow-400/90">
                  This booking is no longer awaiting payment. Check your bookings list for the
                  latest status.
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/bookings" className="hover:text-emerald-400 transition">
              Back to all bookings
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
