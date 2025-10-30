'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react';

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

interface ListingInfo {
  id: string;
  title: string;
  address: {
    city: string;
    state: string;
  };
}

export default function BookingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<{ [key: string]: ListingInfo }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }

    if (user) {
      fetchBookings();
    }
  }, [user, isLoading, router]);

  const fetchBookings = async () => {
    try {
      const data = await api.get('/bookings/guest');
      setBookings(data);

      // Fetch listing details for each booking
      const listingIds = [...new Set(data.map((b: Booking) => b.listingId))];
      const listingData: { [key: string]: ListingInfo } = {};
      
      for (const id of listingIds) {
        try {
          const listing = await api.get(`/listings/${id}`);
          listingData[id] = listing;
        } catch (error) {
          console.error(`Error fetching listing ${id}:`, error);
        }
      }
      
      setListings(listingData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilCheckIn = (checkIn: Date) => {
    const today = new Date();
    const checkInDate = new Date(checkIn);
    const diff = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredBookings = bookings.filter((booking) => {
    const daysUntil = getDaysUntilCheckIn(booking.checkIn);
    
    if (filter === 'upcoming') {
      return daysUntil >= 0 && booking.status !== 'cancelled';
    } else if (filter === 'past') {
      return daysUntil < 0 || booking.status === 'checked_out';
    }
    return true;
  });

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">Manage your wellness getaway reservations</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-4 border-b">
          <button
            onClick={() => setFilter('all')}
            className={`pb-3 px-4 font-medium transition-colors ${
              filter === 'all'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`pb-3 px-4 font-medium transition-colors ${
              filter === 'upcoming'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`pb-3 px-4 font-medium transition-colors ${
              filter === 'past'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Past
          </button>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No bookings {filter !== 'all' ? `(${filter})` : ''} yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start planning your wellness journey!
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Explore Listings
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => {
              const listing = listings[booking.listingId];
              const daysUntil = getDaysUntilCheckIn(booking.checkIn);
              const nights = Math.ceil(
                (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {listing?.title || 'Loading...'}
                        </h3>
                        {listing && (
                          <div className="flex items-center text-gray-600 mb-2">
                            <MapPin className="w-4 h-4 mr-1" />
                            {listing.address.city}, {listing.address.state}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-gray-700">
                        <Calendar className="w-5 h-5 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Check-in</p>
                          <p className="font-medium">
                            {new Date(booking.checkIn).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Calendar className="w-5 h-5 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Check-out</p>
                          <p className="font-medium">
                            {new Date(booking.checkOut).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Users className="w-5 h-5 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Guests</p>
                          <p className="font-medium">{booking.guests}</p>
                        </div>
                      </div>
                    </div>

                    {daysUntil >= 0 && booking.status !== 'cancelled' && (
                      <div className="flex items-center text-blue-600 mb-4">
                        <Clock className="w-5 h-5 mr-2" />
                        <span className="font-medium">
                          {daysUntil === 0
                            ? 'Check-in today!'
                            : `${daysUntil} days until check-in`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center text-gray-700">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-xl font-bold">
                          ${(booking.total / 100).toFixed(2)}
                        </span>
                        <span className="text-gray-500 ml-2">({nights} nights)</span>
                      </div>
                      <button
                        onClick={() => router.push(`/bookings/${booking.id}`)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

