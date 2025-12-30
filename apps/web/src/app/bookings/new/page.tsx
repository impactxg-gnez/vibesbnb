'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Users, DollarSign, ArrowLeft, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Property {
  id: string;
  name: string;
  location: string;
  price: number;
  images: string[];
  guests: number;
  host_id?: string;
}

interface PriceBreakdown {
  nights: number;
  basePrice: number;
  serviceFee: number;
  total: number;
}

export default function NewBookingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<Record<string, 'blocked' | 'booked'>>({});
  
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    kids: 0,
    pets: 0,
    specialRequests: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (propertyId && user) {
      loadProperty();
    }
  }, [propertyId, user]);

  const loadProperty = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: propertyData, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('status', 'active')
        .single();

      if (error || !propertyData) {
        toast.error('Property not found');
        router.push('/search');
        return;
      }

      setProperty({
        id: propertyData.id,
        name: propertyData.name || propertyData.title || 'Untitled Property',
        location: propertyData.location || '',
        price: propertyData.price ? Number(propertyData.price) : 0,
        images: propertyData.images || [],
        guests: propertyData.guests || 1,
        host_id: propertyData.host_id,
      });

      setFormData(prev => ({
        ...prev,
        guests: propertyData.guests || 1,
      }));

      await loadAvailability(propertyData.id);
    } catch (error) {
      console.error('Error loading property:', error);
      toast.error('Failed to load property');
      router.push('/search');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async (id: string) => {
    try {
      const response = await fetch(`/api/properties/${id}/availability`);
      if (!response.ok) return;
      const data = await response.json();
      const map: Record<string, 'blocked' | 'booked'> = {};
      (data.availability || []).forEach((entry: { day: string; status: string }) => {
        if (entry.status === 'blocked' || entry.status === 'booked') {
          map[entry.day] = entry.status;
        }
      });
      setAvailability(map);
    } catch (error) {
      console.warn('Failed to load availability', error);
    }
  };

  const calculateTotal = (): PriceBreakdown | null => {
    if (!property || !formData.checkIn || !formData.checkOut) return null;
    
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) return null;
    
    const basePrice = property.price * nights;
    const serviceFee = basePrice * 0.1; // 10% service fee
    const total = basePrice + serviceFee;
    
    return { nights, basePrice, serviceFee, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !property) return;

    // Validation
    if (!formData.checkIn || !formData.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      toast.error('Check-in date cannot be in the past');
      return;
    }

    if (checkOutDate <= checkInDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    if (formData.guests > property.guests) {
      toast.error(`This property can only accommodate ${property.guests} guests`);
      return;
    }

    const isRangeAvailable = () => {
      const start = new Date(formData.checkIn);
      const end = new Date(formData.checkOut);
      for (
        let cursor = new Date(start);
        cursor < end;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        const key = cursor.toISOString().split('T')[0];
        if (availability[key]) {
          return false;
        }
      }
      return true;
    };

    if (!isRangeAvailable()) {
      toast.error('Selected dates include blocked or already booked nights.');
      return;
    }

    const priceBreakdown = calculateTotal();
    if (!priceBreakdown) {
      toast.error('Please select valid dates to calculate the total price');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (!supabaseUser) {
        toast.error('Please log in to make a booking');
        return;
      }

      // Get host information
      let hostEmail = '';
      let hostWhatsApp = '';
      if (property.host_id) {
        try {
          // Try to get host info from auth.users (requires service role or admin)
          // For now, we'll get it from the property or use a service role API call
          const { data: hostData } = await supabase
            .from('properties')
            .select('host_id')
            .eq('id', property.id)
            .single();
          
          // Host contact info will be fetched in the API route using service role
        } catch (e) {
          console.warn('Could not fetch host info:', e);
        }
      }

      // Create booking via API route (which will handle notifications)
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id,
          property_name: property.name,
          property_image: property.images[0] || '',
          location: property.location,
          check_in: formData.checkIn,
          check_out: formData.checkOut,
          guests: formData.guests,
          kids: formData.kids || 0,
          pets: formData.pets || 0,
          total_price: priceBreakdown.total,
          special_requests: formData.specialRequests || '',
          guest_name: user.user_metadata?.full_name || user.email || 'Guest',
          guest_email: user.email || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      toast.success('Booking request submitted! The host will be notified and will respond shortly.');
      router.push('/bookings');
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Property not found</h2>
          <Link href="/search" className="text-earth-500 hover:text-earth-400">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const priceBreakdown = calculateTotal();

  return (
    <div className="min-h-screen bg-charcoal-950 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          href={`/listings/${property.id}`}
          className="text-earth-500 hover:text-earth-400 mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to property
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">Complete Your Booking</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6 space-y-6">
              {/* Property Info */}
              <div className="pb-6 border-b border-charcoal-800">
                <h2 className="text-2xl font-bold text-white mb-2">{property.name}</h2>
                <p className="text-mist-400">{property.location}</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-mist-400 mb-2">
                    <Calendar size={16} className="inline mr-2" />
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mist-400 mb-2">
                    <Calendar size={16} className="inline mr-2" />
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    min={formData.checkIn || new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                  />
                </div>
              </div>
              {Object.keys(availability).length > 0 && (
                <p className="text-xs text-red-400">
                  Note: Some dates are unavailable. If a selected range overlaps with blocked or booked nights, you'll be asked to choose new dates.
                </p>
              )}

              {/* Guests */}
              <div>
                <label className="block text-sm font-medium text-mist-400 mb-2">
                  <Users size={16} className="inline mr-2" />
                  Number of Guests
                </label>
                <input
                  type="number"
                  min={1}
                  max={property.guests}
                  value={formData.guests}
                  onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })}
                  required
                  className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                />
                <p className="text-xs text-mist-500 mt-1">Maximum {property.guests} guests</p>
              </div>

              {/* Kids and Pets */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-mist-400 mb-2">Kids</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.kids}
                    onChange={(e) => setFormData({ ...formData, kids: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mist-400 mb-2">Pets</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.pets}
                    onChange={(e) => setFormData({ ...formData, pets: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white"
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-mist-400 mb-2">Special Requests</label>
                <textarea
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  rows={4}
                  placeholder="Any special requests or notes for the host..."
                  className="w-full px-4 py-3 bg-charcoal-800 border border-charcoal-700 rounded-lg focus:ring-2 focus:ring-earth-500 focus:border-transparent text-white placeholder-gray-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !priceBreakdown}
                className="w-full px-6 py-4 bg-earth-600 text-white rounded-lg hover:bg-earth-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-lg"
              >
                {submitting ? (
                  'Submitting...'
                ) : (
                  <>
                    <CreditCard size={20} />
                    Submit Booking Request
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Price Summary */}
          <div className="lg:col-span-1">
            <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6 sticky top-8">
              <h3 className="text-xl font-bold text-white mb-6">Price Summary</h3>
              
              {priceBreakdown ? (
                <>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-mist-400">
                        ${property.price} × {priceBreakdown.nights} {priceBreakdown.nights === 1 ? 'night' : 'nights'}
                      </span>
                      <span className="text-white">${priceBreakdown.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-mist-400">Service fee</span>
                      <span className="text-white">${priceBreakdown.serviceFee.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-charcoal-800 flex justify-between font-bold text-lg">
                    <span className="text-white">Total</span>
                    <span className="text-white">${priceBreakdown.total.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <p className="text-mist-400 text-sm">Select dates to see pricing</p>
              )}

              <div className="mt-6 pt-6 border-t border-charcoal-800">
                <p className="text-xs text-mist-400 text-center">
                  You won't be charged until the host accepts your booking request
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




