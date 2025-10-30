'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Check,
  X,
  MessageSquare,
  Home,
  Clock,
} from 'lucide-react';

interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  hostId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  status: string;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
  currency: string;
  specialRequests?: string;
  createdAt: Date;
}

interface Listing {
  id: string;
  title: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  basePrice: number;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const bookingData = await api.get(`/bookings/${bookingId}`);
      setBooking(bookingData);

      const listingData = await api.get(`/listings/${bookingData.listingId}`);
      setListing(listingData);
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await api.post(`/bookings/${bookingId}/cancel`, {
        reason: 'Guest requested cancellation',
      });
      alert('Booking cancelled successfully');
      fetchBookingDetails();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking');
    }
  };

  const handleCreateItinerary = async () => {
    if (!booking || !listing) return;

    try {
      const itinerary = await api.post('/itinerary', {
        bookingId: booking.id,
        name: `Trip to ${listing.address.city}`,
        startDate: booking.checkIn,
        endDate: booking.checkOut,
        destination: {
          city: listing.address.city,
          state: listing.address.state,
          country: listing.address.country,
        },
      });

      router.push(`/itinerary/${itinerary.id}`);
    } catch (error) {
      console.error('Error creating itinerary:', error);
      alert('Failed to create itinerary');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking || !listing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking not found</h2>
          <button
            onClick={() => router.push('/bookings')}
            className="text-blue-600 hover:text-blue-700"
          >
            Return to bookings
          </button>
        </div>
      </div>
    );
  }

  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const isUpcoming =
    new Date(booking.checkIn) > new Date() && booking.status !== 'cancelled';
  const canCancel =
    isUpcoming &&
    (booking.status === 'pending' || booking.status === 'confirmed');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Message */}
        {booking.status === 'confirmed' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <Check className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold text-green-900">Booking Confirmed!</h3>
              <p className="text-green-700 text-sm">
                Your wellness getaway is all set. Check your email for details.
              </p>
            </div>
          </div>
        )}

        {booking.status === 'pending' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
            <Clock className="w-6 h-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-semibold text-yellow-900">Awaiting Host Approval</h3>
              <p className="text-yellow-700 text-sm">
                The host will review your request and respond soon.
              </p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">Booking Confirmation</h1>
            <p className="text-blue-100">Booking #{booking.id.slice(0, 8)}</p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Property Info */}
            <div className="mb-6 pb-6 border-b">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {listing.title}
              </h2>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2" />
                {listing.address.street}, {listing.address.city}, {listing.address.state}{' '}
                {listing.address.zipCode}
              </div>
            </div>

            {/* Booking Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Check-in</h3>
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-600 mr-3 mt-1" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(booking.checkIn).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">After 3:00 PM</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Check-out</h3>
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-600 mr-3 mt-1" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(booking.checkOut).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600">Before 11:00 AM</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Guests</h3>
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-gray-600 mr-3" />
                  <p className="text-lg text-gray-900">{booking.guests} guests</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Duration</h3>
                <div className="flex items-center">
                  <Home className="w-5 h-5 text-gray-600 mr-3" />
                  <p className="text-lg text-gray-900">{nights} nights</p>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            {booking.specialRequests && (
              <div className="mb-6 pb-6 border-b">
                <h3 className="font-semibold text-gray-900 mb-2">Special Requests</h3>
                <p className="text-gray-700">{booking.specialRequests}</p>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-semibold text-gray-900 mb-4">Price Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>
                    ${(listing.basePrice / 100).toFixed(2)} × {nights} nights
                  </span>
                  <span>${(booking.subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Cleaning fee</span>
                  <span>${(booking.cleaningFee / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Service fee</span>
                  <span>${(booking.serviceFee / 100).toFixed(2)}</span>
                </div>
                {booking.taxes > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Taxes</span>
                    <span>${(booking.taxes / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                  <span>Total ({booking.currency})</span>
                  <span>${(booking.total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push(`/messages?booking=${booking.id}`)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Message Host
              </button>

              <button
                onClick={handleCreateItinerary}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Plan Your Trip
              </button>

              {canCancel && (
                <button
                  onClick={handleCancelBooking}
                  className="flex-1 px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Ready to plan your trip?
          </h3>
          <p className="text-blue-800 mb-4">
            Use our itinerary planner to organize dispensary visits, restaurant reservations,
            wellness activities, and more!
          </p>
          <button
            onClick={handleCreateItinerary}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Itinerary Now
          </button>
        </div>
      </div>
    </div>
  );
}

