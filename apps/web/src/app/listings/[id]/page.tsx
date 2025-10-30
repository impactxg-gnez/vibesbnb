'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { MapPin, Users, Bed, Bath, Star, Wifi, Coffee, Car, Dumbbell, Wind, Heart } from 'lucide-react';
import Image from 'next/image';
import { GoogleMap, MapFallback } from '@/components/map/GoogleMap';

interface Listing {
  id: string;
  title: string;
  description: string;
  hostId: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  basePrice: number;
  cleaningFee: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  minNights: number;
  maxNights: number;
  amenities: string[];
  wellnessTags: string[];
  houseRules: string[];
  status: string;
  instantBook: boolean;
}

interface ListingMedia {
  id: string;
  url: string;
  altText?: string;
}

const amenityIcons: { [key: string]: any } = {
  wifi: Wifi,
  kitchen: Coffee,
  parking: Car,
  gym: Dumbbell,
  air_conditioning: Wind,
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    fetchListing();
    fetchMedia();
  }, [listingId]);

  const fetchListing = async () => {
    try {
      const data = await api.get(`/listings/${listingId}`);
      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async () => {
    try {
      const data = await api.get(`/listings/${listingId}/media`);
      setMedia(data);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const calculateTotal = () => {
    if (!listing || !checkIn || !checkOut) return 0;
    
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const subtotal = (listing.basePrice / 100) * nights;
    const cleaning = listing.cleaningFee / 100;
    const serviceFee = subtotal * 0.1;
    
    return subtotal + cleaning + serviceFee;
  };

  const handleBooking = async () => {
    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates');
      return;
    }

    if (nights < listing.minNights) {
      alert(`Minimum stay is ${listing.minNights} nights`);
      return;
    }

    if (nights > listing.maxNights) {
      alert(`Maximum stay is ${listing.maxNights} nights`);
      return;
    }

    setBookingLoading(true);

    try {
      const bookingData = {
        listingId: listing.id,
        checkIn,
        checkOut,
        guests,
        specialRequests: specialRequests || undefined,
      };

      const booking = await api.post('/bookings', bookingData);
      
      // Redirect to booking confirmation
      router.push(`/bookings/${booking.id}`);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      alert(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing not found</h2>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Return to homepage
          </button>
        </div>
      </div>
    );
  }

  const nights = checkIn && checkOut ? Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  ) : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <div className="flex items-center text-gray-600 gap-4">
            <div className="flex items-center">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="font-semibold">4.8</span>
              <span className="ml-1">(24 reviews)</span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-1" />
              {listing.address.city}, {listing.address.state}
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-4 gap-2 mb-8 rounded-xl overflow-hidden" style={{ height: '500px' }}>
          {media.length > 0 ? (
            <>
              <div className="col-span-2 row-span-2">
                <img
                  src={media[selectedImage]?.url || media[0]?.url}
                  alt={listing.title}
                  className="w-full h-full object-cover cursor-pointer hover:brightness-95"
                  onClick={() => setSelectedImage(0)}
                />
              </div>
              {media.slice(1, 5).map((img, idx) => (
                <div key={img.id} className={idx < 2 ? 'col-span-1 row-span-1' : 'col-span-1 row-span-1'}>
                  <img
                    src={img.url}
                    alt={img.altText || `${listing.title} ${idx + 2}`}
                    className="w-full h-full object-cover cursor-pointer hover:brightness-95"
                    onClick={() => setSelectedImage(idx + 1)}
                  />
                </div>
              ))}
            </>
          ) : (
            <div className="col-span-4 bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500">No images available</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Property Stats */}
            <div className="pb-6 border-b">
              <div className="flex items-center gap-6 text-gray-700">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{listing.maxGuests} guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-5 h-5" />
                  <span>{listing.bedrooms} bedrooms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-5 h-5" />
                  <span>{listing.beds} beds</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-5 h-5" />
                  <span>{listing.bathrooms} baths</span>
                </div>
              </div>
            </div>

            {/* Wellness Tags */}
            {listing.wellnessTags && listing.wellnessTags.length > 0 && (
              <div className="py-6 border-b">
                <h3 className="text-xl font-semibold mb-4">Wellness Features</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.wellnessTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                    >
                      {tag.replace(/_/g, ' ').replace('420', '420')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="py-6 border-b">
              <h3 className="text-xl font-semibold mb-4">About this place</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
            </div>

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <div className="py-6 border-b">
                <h3 className="text-xl font-semibold mb-4">Amenities</h3>
                <div className="grid grid-cols-2 gap-4">
                  {listing.amenities.map((amenity) => {
                    const Icon = amenityIcons[amenity] || Wifi;
                    return (
                      <div key={amenity} className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-700 capitalize">
                          {amenity.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="py-6 border-b">
              <h3 className="text-xl font-semibold mb-4">Location</h3>
              <p className="text-gray-700 mb-4">
                {listing.address.city}, {listing.address.state}, {listing.address.country}
              </p>
              {typeof window !== 'undefined' && (window as any).google && listing.address.lat && listing.address.lng ? (
                <GoogleMap
                  center={{ lat: listing.address.lat, lng: listing.address.lng }}
                  zoom={14}
                  markers={[
                    { lat: listing.address.lat, lng: listing.address.lng, title: listing.title }
                  ]}
                  className="w-full h-96 rounded-lg"
                />
              ) : (
                <MapFallback
                  address={`${listing.address.street}, ${listing.address.city}, ${listing.address.state} ${listing.address.zipCode}`}
                  className="w-full h-96"
                />
              )}
            </div>

            {/* House Rules */}
            {listing.houseRules && listing.houseRules.length > 0 && (
              <div className="py-6">
                <h3 className="text-xl font-semibold mb-4">House Rules</h3>
                <ul className="space-y-2">
                  {listing.houseRules.map((rule) => (
                    <li key={rule} className="text-gray-700 capitalize">
                      • {rule.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 border rounded-xl shadow-lg p-6">
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${(listing.basePrice / 100).toFixed(0)}
                  </span>
                  <span className="text-gray-600">/ night</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guests
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[...Array(listing.maxGuests)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} {i === 0 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>

                {nights > 0 && (
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-gray-700">
                      <span>${(listing.basePrice / 100).toFixed(0)} x {nights} nights</span>
                      <span>${((listing.basePrice / 100) * nights).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Cleaning fee</span>
                      <span>${(listing.cleaningFee / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Service fee</span>
                      <span>${(((listing.basePrice / 100) * nights) * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Requests (optional)
                  </label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requirements or questions?"
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleBooking}
                  disabled={!checkIn || !checkOut || bookingLoading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? 'Processing...' : (listing.instantBook ? 'Book Instantly' : 'Request to Book')}
                </button>

                <p className="text-sm text-gray-500 text-center">
                  {listing.instantBook ? 'Your booking will be confirmed immediately' : 'The host will review your request'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

