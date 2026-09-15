'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, CheckCircle2, MapPin, Users } from 'lucide-react';
import { formatCalendarDate } from '@/lib/dateUtils';
import { PayPalBookingButtons } from '@/components/payments/PayPalBookingButtons';

export type PayBookingView = {
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

function canPayBooking(booking: PayBookingView): boolean {
  return (
    booking.paymentStatus === 'pending' &&
    (booking.status === 'accepted' || booking.status === 'pending_approval')
  );
}

export function PayBookingClient({
  booking: initial,
  claim,
}: {
  booking: PayBookingView;
  claim?: string | null;
}) {
  const [booking, setBooking] = useState(initial);
  const formatDate = (value: string) =>
    formatCalendarDate(value, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

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
                    claim={claim}
                    onPaid={() => {
                      setBooking((prev) => ({
                        ...prev,
                        paymentStatus: 'paid',
                        status: 'confirmed',
                      }));
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

export function PayBookingNotFound() {
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
