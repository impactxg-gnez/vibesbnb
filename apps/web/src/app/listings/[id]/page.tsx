'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  ChevronRight,
  Check,
  Sparkles,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Brain,
  ShieldCheck,
  ArrowRight,
  Leaf
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import PropertyChatButton from '@/components/chat/PropertyChatButton';
import { PropertyMap } from '@/components/PropertyMap';
import NearbyDispensaries, { InventoryItem } from '@/components/NearbyDispensaries';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  formatCalendarDate,
  nightsBetweenYmd,
  todayLocalYmd,
} from '@/lib/dateUtils';

interface Property {
  id: string;
  name: string;
  location: string;
  description: string;
  price: number;
  cleaningFee?: number;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  images: string[];
  amenities: string[];
  wellnessFriendly: boolean;
  smokingInsideAllowed: boolean;
  smokingOutsideAllowed: boolean;
  rating: number;
  reviews: number;
  latitude?: number;
  longitude?: number;
  hostId: string;
  hostName: string;
  hostImage: string;
  hostBio?: string;
  hostJoinedDate?: string;
  type?: string;
  vibesbnb_take?: string;
  rooms?: Array<{
    id: string;
    name: string;
    price: number;
    guests: number;
    images: string[];
  }>;
}

// Helper to get general area from location (hide exact address)
const getGeneralLocation = (location: string): string => {
  if (!location) return '';
  // Split by comma and take last 2-3 parts (city, state, country)
  const parts = location.split(',').map(p => p.trim());
  if (parts.length <= 2) return location;
  // Return city, state/country (last 2 parts)
  return parts.slice(-2).join(', ');
};

// Helper to add some randomness to coordinates for privacy (within ~500m)
const obfuscateCoordinates = (lat?: number, lng?: number): { lat?: number; lng?: number } => {
  if (!lat || !lng) return { lat: undefined, lng: undefined };
  // Add random offset of up to ~500 meters (0.005 degrees ≈ 500m)
  const latOffset = (Math.random() - 0.5) * 0.01;
  const lngOffset = (Math.random() - 0.5) * 0.01;
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset
  };
};

/** Derive smoking flags from DB + legacy smoke_friendly / localStorage. */
function resolveSmokingFlags(row: Record<string, unknown>): {
  inside: boolean;
  outside: boolean;
} {
  let inside =
    row.smoking_inside_allowed === true || row.smokingInsideAllowed === true;
  let outside =
    row.smoking_outside_allowed === true || row.smokingOutsideAllowed === true;
  if (!inside && !outside) {
    const legacy =
      row.smoke_friendly === true || row.smokeFriendly === true;
    if (legacy) outside = true;
  }
  return { inside, outside };
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
  const searchParams = useSearchParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(true);
  const [wellnessCart, setWellnessCart] = useState<InventoryItem[]>([]);
  
  const scrollToReviews = () => {
    setIsAboutExpanded(true);
    setTimeout(() => {
      const element = document.getElementById('reviews-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  };
  
  // Date selection state - initialized from URL params
  const [checkInDate, setCheckInDate] = useState<string>(searchParams.get('checkIn') || '');
  const [checkOutDate, setCheckOutDate] = useState<string>(searchParams.get('checkOut') || '');
  
  // Calculate number of nights
  const calculateNights = (): number => nightsBetweenYmd(checkInDate, checkOutDate);
  
  const stayDuration = calculateNights();

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
            propertyData = {
              ...data,
              wellnessFriendly: data.wellness_friendly,
              hostId: data.host_id,
              vibesbnb_take: data.vibesbnb_take,
            };
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

        // Fetch Host Profile
        let hostName = 'Property Host';
        let hostImage = `https://api.dicebear.com/7.x/initials/svg?seed=${propertyData.host_id || 'host'}`;
        let hostBio = '';
        let hostJoinedDate = '2024';

        if (propertyData.host_id && isSupabaseConfigured) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', propertyData.host_id)
              .single();

            if (profile) {
              hostName = profile.full_name || hostName;
              hostImage = profile.avatar_url || hostImage;
              hostBio = profile.bio || '';
              hostJoinedDate = new Date(profile.created_at).getFullYear().toString();
            }
          } catch (e) {
            console.error('[Listing Detail] Error fetching host profile:', e);
          }
        }

        // Fetch Reviews
        let reviews: any[] = [];
        if (isSupabaseConfigured) {
          try {
            const { data: reviewsData } = await supabase
              .from('reviews')
              .select('*, profiles(full_name, avatar_url)')
              .eq('property_id', params.id as string)
              .eq('status', 'approved')
              .order('created_at', { ascending: false });

            if (reviewsData) {
              reviews = reviewsData;
            }
          } catch (e) {
            console.error('[Listing Detail] Error fetching reviews:', e);
          }
        }

        // Calculate Average Rating
        const avgRating = reviews.length > 0
          ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
          : 0;

        const smoking = resolveSmokingFlags(propertyData);
        const loadedProperty: Property = {
          id: propertyData.id,
          name: propertyData.name || propertyData.title || 'Untitled Property',
          location: propertyData.location || '',
          description: propertyData.description || 'No description available.',
          price: propertyData.price ? Number(propertyData.price) : 0,
          cleaningFee:
            propertyData.cleaning_fee != null
              ? Number(propertyData.cleaning_fee)
              : propertyData.cleaningFee != null
                ? Number(propertyData.cleaningFee)
                : 0,
          bedrooms: propertyData.bedrooms || 0,
          bathrooms: propertyData.bathrooms || 0,
          guests: propertyData.guests || 0,
          images: propertyData.images || [],
          amenities: propertyData.amenities || [],
          wellnessFriendly: propertyData.wellness_friendly || propertyData.wellnessFriendly || false,
          smokingInsideAllowed: smoking.inside,
          smokingOutsideAllowed: smoking.outside,
          rating: avgRating || Number(propertyData.rating || 0),
          reviews: reviews.length,
          hostId: propertyData.host_id || '',
          hostName,
          hostImage,
          hostBio,
          hostJoinedDate,
          latitude: propertyData.latitude ? Number(propertyData.latitude) : undefined,
          longitude: propertyData.longitude ? Number(propertyData.longitude) : undefined,
          type: propertyData.type || 'Retreat',
          rooms: propertyData.rooms || [],
        };

        setProperty(loadedProperty);
        setReviewsData(reviews);
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
    const selectedRoomsParam = selectedRoomIds.length > 0 ? `&selectedUnits=${selectedRoomIds.join(',')}` : '';
    const dateParams = `${checkInDate ? `&checkIn=${checkInDate}` : ''}${checkOutDate ? `&checkOut=${checkOutDate}` : ''}`;
    router.push(`/bookings/new?propertyId=${params.id}${selectedRoomsParam}${dateParams}`);
  };

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const calculateTotalPrice = () => {
    if (!property) return 0;
    if (property.rooms && property.rooms.length > 0 && selectedRoomIds.length > 0) {
      return property.rooms
        .filter(room => selectedRoomIds.includes(room.id))
        .reduce((sum, room) => sum + room.price, 0);
    }
    return property.price;
  }

  const handleAddToWellnessCart = (item: InventoryItem) => {
    setWellnessCart(prev => [...prev, item]);
    toast.success(`Added ${item.name} to wellness supplies`);
  };

  const wellnessTotal = wellnessCart.reduce((sum, item) => sum + item.price, 0);
  const currentPrice = calculateTotalPrice();
  const nightlySubtotal = stayDuration > 0 ? currentPrice * stayDuration : 0;
  const cleaningFeeAmount = stayDuration > 0 ? property?.cleaningFee || 0 : 0;
  const preServiceSubtotal = nightlySubtotal + cleaningFeeAmount;
  const serviceFee = stayDuration > 0 ? Math.round(preServiceSubtotal * 0.1) : 0;
  const finalTotal = stayDuration > 0 ? preServiceSubtotal + serviceFee + wellnessTotal : wellnessTotal;

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
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-gray-400">
              <p className="text-emerald-400 font-semibold tracking-wide">
                {property.type ? `${property.type} in ` : ''}{getGeneralLocation(property.location)}
              </p>
              <span className="hidden md:block text-gray-700">•</span>
              <button 
                onClick={scrollToReviews} 
                className="flex items-center gap-1 hover:text-emerald-400 hover:underline transition-colors focus:outline-none"
              >
                <Star size={18} className={property.reviews > 0 ? "text-primary-500 fill-primary-500" : "text-gray-600"} />
                <span className="text-white font-semibold">
                  {property.reviews > 0 ? property.rating : 'New'}
                </span>
                <span className="text-sm">({property.reviews} {property.reviews === 1 ? 'review' : 'reviews'})</span>
              </button>
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
              className={`p-3 rounded-lg transition ${isFavorite
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
            >
              <Heart size={20} className={isFavorite ? 'fill-white' : ''} />
            </button>
          </div>
        </div>

        {/* Image Gallery and Map Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Image Gallery */}
          <div className="relative h-96 md:h-[500px] rounded-xl overflow-hidden">
            <img
              src={property.images[currentImageIndex]}
              alt={`${property.name} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
            />

            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 items-start max-w-[min(100%,18rem)]">
              {property.wellnessFriendly && (
                <div className="bg-emerald-600 text-white px-4 py-2 rounded-full font-semibold shadow-lg">
                  🧘 Wellness-Friendly
                </div>
              )}
              {property.smokingInsideAllowed && (
                <div className="flex items-center gap-2 bg-amber-600/95 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg border border-amber-400/30">
                  <span className="shrink-0" aria-hidden>🔥</span>
                  Smoking allowed inside
                </div>
              )}
              {property.smokingOutsideAllowed && (
                <div className="flex items-center gap-2 bg-slate-700/95 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg border border-white/15">
                  <span className="shrink-0" aria-hidden>🔥</span>
                  Smoking allowed outside
                </div>
              )}
            </div>

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
                      className={`w-2 h-2 rounded-full transition ${index === currentImageIndex ? 'bg-white w-8' : 'bg-white/50'
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Map - Shows approximate location only */}
          {property.latitude && property.longitude && (() => {
            const approxCoords = obfuscateCoordinates(property.latitude, property.longitude);
            return (
              <div className="h-96 md:h-[500px] rounded-xl overflow-hidden border border-gray-800 relative">
                <PropertyMap
                  latitude={approxCoords.lat!}
                  longitude={approxCoords.lng!}
                  propertyName={property.name}
                />
                {/* Privacy notice overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-3 border border-gray-700">
                  <p className="text-sm text-gray-300 flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                    <span>Approximate location shown. Exact address provided after booking confirmation.</span>
                  </p>
                </div>
              </div>
            );
          })()}
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
              {(property.smokingInsideAllowed || property.smokingOutsideAllowed) && (
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-white/10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1">
                    Smoking
                  </span>
                  {property.smokingInsideAllowed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/20 text-amber-300 px-3 py-1 text-sm font-medium border border-amber-500/30">
                      <span aria-hidden>🔥</span>
                      Inside OK
                    </span>
                  )}
                  {property.smokingOutsideAllowed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 text-gray-200 px-3 py-1 text-sm font-medium border border-white/15">
                      <span aria-hidden>🔥</span>
                      Outside OK
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Amenities - Moved to top */}
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

            {/* Room/Unit Selection — optional; whole-property pricing applies when none selected */}
            {property.rooms && property.rooms.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Available Units</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Optional — select specific units or continue without selection to use the listing&apos;s base nightly rate.
                </p>
                <div className="space-y-4">
                  {property.rooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => toggleRoomSelection(room.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition cursor-pointer ${selectedRoomIds.includes(room.id)
                          ? 'bg-emerald-600/10 border-emerald-500'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition ${selectedRoomIds.includes(room.id)
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'bg-transparent border-gray-600'
                          }`}>
                          {selectedRoomIds.includes(room.id) && <Check size={16} className="text-white" />}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{room.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Users size={14} />
                            <span>Up to {room.guests} guests</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">${room.price}</div>
                        <div className="text-xs text-gray-400">per night</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About this place */}
            <div id="about-section" className="bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <div 
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsAboutExpanded(!isAboutExpanded)}
              >
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  About this place
                  <span className="bg-primary-500/10 text-primary-400 text-xs px-2 py-1 rounded-full border border-primary-500/20">Official</span>
                </h2>
                {isAboutExpanded ? <ChevronUp size={24} className="text-gray-400" /> : <ChevronDown size={24} className="text-gray-400" />}
              </div>

              <div className={`transition-all duration-500 overflow-hidden ${isAboutExpanded ? 'max-h-[2000px] border-t border-white/5' : 'max-h-0'}`}>
                <div className="p-6 py-2 space-y-6">
                  {/* Two Categories Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    {/* Category 1: AI Summary */}
                    <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-5 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Brain size={48} className="text-primary-500" />
                      </div>
                      <div className="flex items-center gap-2 mb-3 text-primary-400 font-bold text-sm uppercase tracking-wider">
                        <Sparkles size={16} />
                        AI Summary
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed relative z-10">
                        {property.description.length > 100 
                          ? `${property.description.substring(0, 120)}... This ${property.type?.toLowerCase() || 'retreat'} offers a blend of comfort and style, perfect for those seeking a unique ${property.wellnessFriendly ? 'wellness-oriented' : ''} stay in ${getGeneralLocation(property.location).split(',')[0]}.`
                          : "This property is highly recommended for its excellent location and premium amenities."}
                      </p>
                    </div>

                    {/* Category 2: Reviews Summary */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MessageSquare size={48} className="text-blue-500" />
                      </div>
                      <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold text-sm uppercase tracking-wider">
                        <Star size={16} />
                        Guest Sentiment
                      </div>
                      <div className="text-gray-300 text-sm leading-relaxed relative z-10">
                        {property.reviews > 0 ? (
                          <>
                            Guests generally praise the <span className="text-white font-medium">cleanliness</span> and <span className="text-white font-medium">amenities</span>. 
                            The average rating of <span className="text-white font-medium">{property.rating}★</span> suggests an exceptional stay experience based on {property.reviews} recent {property.reviews === 1 ? 'review' : 'reviews'}.
                          </>
                        ) : (
                          <span className="text-gray-400 italic">There aren't many user reviews for this property yet. Be one of the first to share your experience!</span>
                        )}
                      </div>
                    </div>

                    {/* Category 3: VibesBNB Take */}
                    {property.vibesbnb_take && (
                      <div className="md:col-span-2 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Leaf size={48} className="text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                          <Sparkles size={18} />
                          VibesBNB Take
                        </div>
                        <div className="text-gray-300 text-base leading-relaxed relative z-10 italic">
                          "{property.vibesbnb_take}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full Description with local collapse */}
                  <div className="relative">
                    <div className={`text-gray-300 leading-relaxed space-y-4 ${isDescriptionCollapsed ? 'line-clamp-4' : ''}`}>
                      {property.description.split('\n\n').map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                    <button 
                      onClick={() => setIsDescriptionCollapsed(!isDescriptionCollapsed)}
                      className="mt-4 text-primary-400 hover:text-primary-300 font-bold text-sm flex items-center gap-1 group"
                    >
                      {isDescriptionCollapsed ? 'Show more' : 'Show less'}
                      <ArrowRight size={14} className={`transition-transform ${isDescriptionCollapsed ? '' : '-rotate-90'}`} />
                    </button>
                  </div>

                  {/* Reviews List */}
                  <div id="reviews-section" className="mt-8 pt-8 border-t border-white/5 pb-6">
                    <h3 className="text-xl font-bold text-white mb-6">Recent Guest Reviews</h3>
                    {reviewsData.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {reviewsData.slice(0, 4).map((review) => (
                            <div key={review.id} className={`bg-white/5 border rounded-2xl p-5 ${review.is_team_review ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5'}`}>
                              <div className="flex items-center gap-3 mb-3">
                                {review.is_team_review ? (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-primary-500 flex items-center justify-center border border-purple-400/30">
                                    <span className="text-white text-xs font-bold">VB</span>
                                  </div>
                                ) : (
                                  <img 
                                    src={review.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${review.user_id}`} 
                                    className="w-10 h-10 rounded-full border border-white/10" 
                                    alt="reviewer"
                                  />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm ${review.is_team_review ? 'text-purple-400' : 'text-white'}`}>
                                      {review.is_team_review ? (review.reviewer_name || 'VibesBNB Team') : (review.profiles?.full_name || 'Guest')}
                                    </span>
                                    {review.is_team_review && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-400 rounded">VERIFIED</span>
                                    )}
                                  </div>
                                  <div className="text-gray-500 text-xs">{new Date(review.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="ml-auto flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                                  <span className="text-primary-500 text-[10px]">★</span>
                                  <span className="text-white text-[10px] font-bold">{review.rating}</span>
                                </div>
                              </div>
                              <p className="text-gray-400 text-sm italic">"{review.comment}"</p>
                            </div>
                          ))}
                        </div>
                        {property.reviews > 4 && (
                          <button className="mt-6 w-full py-3 border border-white/10 rounded-xl text-white font-bold text-sm hover:bg-white/5 transition-colors">
                            Show all {property.reviews} reviews
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-500">
                        <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
                        <p>No reviews for this property yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Wellness supplies / nearby dispensaries — needs lat/lng to match delivery radius */}
            {property.location &&
              property.latitude != null &&
              property.longitude != null && (
                <NearbyDispensaries
                  propertyLocation={getGeneralLocation(property.location)}
                  propertyCoordinates={{
                    lat: property.latitude,
                    lng: property.longitude,
                  }}
                  propertyId={property.id}
                  propertyName={property.name}
                  onAddItem={handleAddToWellnessCart}
                />
              )}

            {/* Host Info */}
            <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldCheck size={80} className="text-primary-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-6">Meet your Host</h2>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                <div className="relative">
                  <img
                    src={property.hostImage}
                    alt={property.hostName}
                    className="w-24 h-24 rounded-full border-4 border-primary-500/20"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-primary-500 text-black p-1.5 rounded-full shadow-lg border-2 border-gray-900">
                    <ShieldCheck size={14} />
                  </div>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold text-white mb-1">{property.hostName}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-4 text-gray-400 text-sm mb-3">
                    <span className="flex items-center gap-1"><Star size={14} className="text-primary-500" /> Superhost</span>
                    <span>•</span>
                    <span>Joined in {property.hostJoinedDate}</span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {property.hostBio || "Hi, I'm your host! I love sharing my unique spaces and helping travelers feel at home while exploring the vibes of the city."}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                    <Link 
                      href={`/users/${property.hostId}`}
                      className="px-6 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-primary-500 transition-all shadow-lg"
                    >
                      Check Profile
                    </Link>
                  <Link 
                    href="/messages"
                    className="px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                  >
                  <MessageSquare size={18} />
                  Message Host
                </Link>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-8">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-white">${currentPrice}</span>
                  <span className="text-gray-400">/ night</span>
                </div>
                <button onClick={scrollToReviews} className="flex items-center gap-1 text-sm hover:text-emerald-400 hover:underline transition-colors focus:outline-none">
                  <Star size={16} className={property.reviews > 0 ? "text-primary-500 fill-primary-500" : "text-gray-500"} />
                  <span className="text-white font-semibold group-hover:text-emerald-400 transition-colors">
                    {property.reviews > 0 ? property.rating : 'New'}
                  </span>
                  <span className="text-gray-400">({property.reviews} {property.reviews === 1 ? 'review' : 'reviews'})</span>
                </button>
              </div>

              {/* Date Selection */}
              <div className="mb-4 border border-gray-700 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-gray-700">
                  <div className="p-3">
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Check-in</label>
                    <DatePicker
                      value={checkInDate}
                      onChange={(dateStr: string) => setCheckInDate(dateStr)}
                      min={todayLocalYmd()}
                      className="w-full bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div className="p-3">
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Check-out</label>
                    <DatePicker
                      value={checkOutDate}
                      onChange={(dateStr: string) => setCheckOutDate(dateStr)}
                      min={checkInDate || todayLocalYmd()}
                      className="w-full bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
                {/* Selected dates display */}
                {checkInDate && checkOutDate && stayDuration > 0 && (
                  <div className="bg-emerald-900/30 border-t border-gray-700 px-3 py-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-400 font-medium flex items-center gap-2">
                        <Calendar size={14} />
                        {formatCalendarDate(checkInDate, { month: 'short', day: 'numeric' })} - {formatCalendarDate(checkOutDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-emerald-400 font-semibold">{stayDuration} {stayDuration === 1 ? 'night' : 'nights'}</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleBooking}
                className="w-full px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold text-lg mb-4"
              >
                <Calendar size={20} className="inline mr-2" />
                {checkInDate && checkOutDate ? 'Reserve' : 'Check Availability'}
              </button>

              <PropertyChatButton
                propertyId={property.id}
                propertyName={property.name}
              />

              <div className="text-center text-sm text-gray-400">
                You won't be charged yet
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800 space-y-3">
                {stayDuration > 0 ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">${currentPrice} × {stayDuration} {stayDuration === 1 ? 'night' : 'nights'}</span>
                      <span className="text-white">${nightlySubtotal}</span>
                    </div>
                    {cleaningFeeAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Cleaning fee (per stay)</span>
                        <span className="text-white">${cleaningFeeAmount}</span>
                      </div>
                    )}
                    {wellnessCart.length > 0 && (
                      <div className="flex justify-between text-sm animate-in fade-in slide-in-from-left-2 transition-all">
                        <span className="text-primary-500 font-medium flex items-center gap-1">
                          <Leaf className="w-3 h-3" />
                          Wellness Supplies ({wellnessCart.length})
                        </span>
                        <span className="text-primary-500 font-bold">+ ${wellnessTotal}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Service fee</span>
                      <span className="text-white">${serviceFee}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-3 border-t border-gray-800">
                      <span className="text-white">Total</span>
                      <span className="text-white text-xl text-primary-500">${finalTotal}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm text-center">Select dates to see total price</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
