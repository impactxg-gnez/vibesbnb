'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  MapPin, 
  Users, 
  Bed, 
  Bath, 
  Wifi, 
  Car, 
  Wind,
  Tv,
  Coffee,
  Dumbbell,
  Heart,
  Share2,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Property {
  id: string;
  name: string;
  location: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  images: string[];
  amenities: string[];
  wellnessFriendly: boolean;
  rating: number;
  reviews: number;
  hostName: string;
  hostImage: string;
}

const amenityIcons: { [key: string]: any } = {
  'WiFi': Wifi,
  'Parking': Car,
  'Air Conditioning': Wind,
  'TV': Tv,
  'Kitchen': Coffee,
  'Gym': Dumbbell,
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const loadProperty = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const isSupabaseConfigured = supabaseUrl && 
                                      supabaseUrl !== '' &&
                                      supabaseUrl !== 'https://placeholder.supabase.co';
        
        let propertyData: any = null;

        // Try to load from Supabase if configured
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', params.id as string)
            .eq('status', 'active')
            .single();

          if (!error && data) {
            propertyData = data;
          }
        }

        // Fallback to localStorage if Supabase is not configured or query failed
        if (!propertyData) {
          console.log('[Listing Detail] Loading property from localStorage fallback');
          const allProperties: any[] = [];
          
          // Check all localStorage keys for properties
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('properties_')) {
              try {
                const userProperties = JSON.parse(localStorage.getItem(key) || '[]');
                // Include active properties or properties without status
                const activeProperties = userProperties.filter((p: any) => 
                  p.status === 'active' || !p.status
                );
                allProperties.push(...activeProperties);
              } catch (e) {
                console.error('[Listing Detail] Error parsing localStorage properties:', e);
              }
            }
          });
          
          // Find the property by ID
          propertyData = allProperties.find((p: any) => p.id === params.id);
          
          if (propertyData) {
            console.log('[Listing Detail] Found property in localStorage:', propertyData.id);
          }
        }

        if (!propertyData) {
          setProperty(null);
          setLoading(false);
          return;
        }

        // Get host info - use placeholder for now since we can't access other users' data without admin
        // TODO: Create a public profiles table or use a different approach
        let hostName = 'Host';
        let hostImage = 'https://api.dicebear.com/7.x/initials/svg?seed=Host';
        
        // For now, we'll use a generic host name
        // In production, you'd want to create a public profiles table or use a different approach
        if (propertyData.host_id) {
          hostName = 'Property Host';
          hostImage = `https://api.dicebear.com/7.x/initials/svg?seed=${propertyData.host_id}`;
        }

        const loadedProperty: Property = {
          id: propertyData.id,
          name: propertyData.name || propertyData.title || 'Untitled Property',
          location: propertyData.location || '',
          description: propertyData.description || 'No description available.',
          price: propertyData.price ? Number(propertyData.price) : 0,
          bedrooms: propertyData.bedrooms || 0,
          bathrooms: propertyData.bathrooms || 0,
          guests: propertyData.guests || 0,
          images: propertyData.images || [],
          amenities: propertyData.amenities || [],
          wellnessFriendly: propertyData.wellness_friendly || propertyData.wellnessFriendly || false,
          rating: propertyData.rating ? Number(propertyData.rating) : 4.5,
          reviews: 0, // TODO: Get from reviews table
          hostName,
          hostImage,
        };

        setProperty(loadedProperty);
      } catch (error) {
        console.error('Error loading property:', error);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [params.id]);

  const nextImage = () => {
    if (property) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const prevImage = () => {
    if (property) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleBooking = () => {
    router.push(`/bookings/new?propertyId=${params.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Property not found</h2>
          <Link href="/" className="text-emerald-500 hover:text-emerald-400">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/search"
          className="text-emerald-500 hover:text-emerald-400 mb-6 inline-flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          Back to search
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{property.name}</h1>
            <div className="flex items-center gap-4 text-gray-400">
              <div className="flex items-center gap-1">
                <Star size={18} className="text-yellow-500 fill-yellow-500" />
                <span className="text-white font-semibold">{property.rating}</span>
                <span>({property.reviews} reviews)</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MapPin size={18} />
                <span>{property.location}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={handleFavorite}
              className={`p-3 rounded-lg transition ${
                isFavorite
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <Heart size={20} className={isFavorite ? 'fill-white' : ''} />
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative h-96 md:h-[500px] mb-8 rounded-xl overflow-hidden">
          <img
            src={property.images[currentImageIndex]}
            alt={`${property.name} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          
          {property.wellnessFriendly && (
            <div className="absolute top-4 left-4 bg-emerald-600 text-white px-4 py-2 rounded-full font-semibold">
              🧘 Wellness-Friendly
            </div>
          )}

          {property.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {property.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentImageIndex ? 'bg-white w-8' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-gray-400" />
                  <span className="text-white">{property.guests} guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed size={20} className="text-gray-400" />
                  <span className="text-white">{property.bedrooms} bedrooms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath size={20} className="text-gray-400" />
                  <span className="text-white">{property.bathrooms} bathrooms</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">About this place</h2>
              <p className="text-gray-300 leading-relaxed">{property.description}</p>
            </div>

            {/* Amenities */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.amenities.map((amenity) => {
                  const Icon = amenityIcons[amenity] || Coffee;
                  return (
                    <div key={amenity} className="flex items-center gap-3 text-gray-300">
                      <Icon size={20} className="text-emerald-500" />
                      <span>{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Host Info */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Hosted by {property.hostName}</h2>
              <div className="flex items-center gap-4">
                <img
                  src={property.hostImage}
                  alt={property.hostName}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <p className="text-white font-semibold">{property.hostName}</p>
                  <p className="text-gray-400 text-sm">Joined in 2024</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-8">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-white">${property.price}</span>
                  <span className="text-gray-400">/ night</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-white font-semibold">{property.rating}</span>
                  <span className="text-gray-400">({property.reviews} reviews)</span>
                </div>
              </div>

              <button
                onClick={handleBooking}
                className="w-full px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold text-lg mb-4"
              >
                <Calendar size={20} className="inline mr-2" />
                Book Now
              </button>

              <div className="text-center text-sm text-gray-400">
                You won't be charged yet
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">${property.price} × 5 nights</span>
                  <span className="text-white">${property.price * 5}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Service fee</span>
                  <span className="text-white">${Math.round(property.price * 5 * 0.1)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-3 border-t border-gray-800">
                  <span className="text-white">Total</span>
                  <span className="text-white">${property.price * 5 + Math.round(property.price * 5 * 0.1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
