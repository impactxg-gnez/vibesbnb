'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Users, Star, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

interface Booking {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyImage: string;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  kids?: number;
  pets?: number;
  totalPrice: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  rating?: number;
}

export default function BookingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      // Try to load from Supabase (cloud storage - syncs across devices)
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', supabaseUser.id)
            .order('check_in', { ascending: false });

          if (!error && data) {
            // Transform Supabase data to Booking format
            const transformedBookings: Booking[] = data.map((booking: any) => ({
              id: booking.id,
              propertyId: booking.property_id,
              propertyName: booking.property_name,
              propertyImage: booking.property_image,
              location: booking.location,
              checkIn: booking.check_in,
              checkOut: booking.check_out,
              guests: booking.guests,
              kids: booking.kids || 0,
              pets: booking.pets || 0,
              totalPrice: booking.total_price,
              status: booking.status,
              rating: booking.rating,
            }));
            setBookings(transformedBookings);
            setLoadingBookings(false);
            return;
          }
        } catch (supabaseError) {
          console.log('Supabase not available, trying localStorage fallback');
        }
      }

      // Try backend API as second option
      if (process.env.NEXT_PUBLIC_API_URL) {
        try {
          const response = await api.get<Booking[]>('/bookings');
          if (response && Array.isArray(response)) {
            setBookings(response);
            setLoadingBookings(false);
            return;
          }
        } catch (apiError) {
          console.log('API not available, using localStorage fallback');
        }
      }

      // Fallback to localStorage (client-side only - won't sync across devices)
      const bookingsKey = `bookings_${user?.id}`;
      const savedBookings = localStorage.getItem(bookingsKey);
      
      if (savedBookings) {
        const parsedBookings = JSON.parse(savedBookings) as Booking[];
        setBookings(parsedBookings);
      } else {
        // Mock data for demo
        setBookings([
          {
            id: '1',
            propertyId: '1',
            propertyName: 'Mountain View Cabin',
            propertyImage: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400&h=300&fit=crop',
            location: 'Colorado, USA',
            checkIn: '2024-12-15',
            checkOut: '2024-12-20',
            guests: 2,
            kids: 1,
            pets: 0,
            totalPrice: 750,
            status: 'confirmed',
            rating: 4.9,
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading || loadingBookings) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading bookings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-gray-400 mb-8">Manage your upcoming and past stays</p>

          {bookings.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No bookings yet</h2>
              <p className="text-gray-400 mb-6">Start exploring properties and book your first stay!</p>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition"
              >
                Browse Properties
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/listings/${booking.propertyId}`}
                  className="block bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-emerald-500/50 transition group"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="relative w-full md:w-64 h-48 md:h-auto">
                      <Image
                        src={booking.propertyImage}
                        alt={booking.propertyName}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition">
                            {booking.propertyName}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {booking.location}
                            </div>
                            {booking.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                {booking.rating}
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-gray-400 text-xs">Check In</p>
                            <p className="font-medium">{formatDate(booking.checkIn)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-gray-400 text-xs">Check Out</p>
                            <p className="font-medium">{formatDate(booking.checkOut)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-gray-400 text-xs">Guests</p>
                            <p className="font-medium">
                              {booking.guests}
                              {booking.kids ? ` + ${booking.kids} kids` : ''}
                              {booking.pets ? ` + ${booking.pets} pet${booking.pets > 1 ? 's' : ''}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-400 text-xs">Total Price</p>
                          <p className="font-semibold text-lg text-emerald-400">${booking.totalPrice}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

