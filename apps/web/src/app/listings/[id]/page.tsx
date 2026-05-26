'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Leaf,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PropertyChatButton from '@/components/chat/PropertyChatButton';
import { PropertyMap } from '@/components/PropertyMap';
import NearbyDispensaries, { InventoryItem } from '@/components/NearbyDispensaries';
import { saveWellnessCartForBooking } from '@/lib/wellnessBookingCart';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  formatCalendarDate,
  nightsBetweenYmd,
  todayLocalYmd,
} from '@/lib/dateUtils';
import { resolveSmokingFlags } from '@/lib/propertySmoking';
import { resolveWellnessConsumptionFlags } from '@/lib/wellnessConsumption';
import { PROPERTY_DETAIL_PUBLIC_COLUMNS } from '@/lib/propertyPublicSelect';
import { buildBookingQuoteFromProperty } from '@/lib/bookingQuote';
import { ReservationQuote } from '@/components/booking/ReservationQuote';
import { listingGalleryImageUrl } from '@/lib/propertyImageUrls';
import { WellnessConsumptionPill } from '@/components/properties/WellnessConsumptionPill';
import { PropertyListingRating } from '@/components/properties/PropertyListingRating';
import { HostStatusBadge } from '@/components/hosts/HostStatusBadge';
import type { HostBadge } from '@/lib/hostBadge';
import { minNightsLabel, normalizeMinBookingNights } from '@/lib/minBookingNights';

const GALLERY_HERO_BLUR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P8/AwAI/AL+Xqz2AAAAAElFTkSuQmCC';

const PDP_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1400&h=1050&fit=crop';

interface Property {
  id: string;
  name: string;
  location: string;
  description: string;
  price: number;
  cleaningFee?: number;
  refundableDeposit?: number;
  allowExtraGuests?: boolean;
  extraGuestPrice?: number;
  /** When set, stay must be at least this many nights */
  minBookingNights?: number | null;
  allowDirectBooking?: boolean;
  bedrooms: number;
  /** Total beds when set (may exceed bedroom count) */
  beds?: number | null;
  bathrooms: number;
  guests: number;
  images: string[];
  amenities: string[];
  wellnessFriendly: boolean;
  wellnessConsumptionIndoorAllowed: boolean;
  wellnessConsumptionOutdoorAllowed: boolean;
  smokingInsideAllowed: boolean;
  smokingOutsideAllowed: boolean;
  rating: number;
  reviews: number;
  createdAt?: string | null;
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
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryUseOriginal, setGalleryUseOriginal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(true);
  const [wellnessCart, setWellnessCart] = useState<InventoryItem[]>([]);
  const [hostDisplayBadge, setHostDisplayBadge] = useState<HostBadge | null>(null);

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
  const [partyAdults, setPartyAdults] = useState(
    Math.max(1, parseInt(searchParams.get('guests') || '1', 10) || 1)
  );
  const [partyKids, setPartyKids] = useState(
    Math.max(0, parseInt(searchParams.get('kids') || '0', 10) || 0)
  );
  const [partyPets, setPartyPets] = useState(
    Math.max(0, parseInt(searchParams.get('pets') || '0', 10) || 0)
  );
  const [checkOutDate, setCheckOutDate] = useState<string>(searchParams.get('checkOut') || '');
  const [openBookingChat, setOpenBookingChat] = useState(false);
  
  // Calculate number of nights
  const calculateNights = (): number => nightsBetweenYmd(checkInDate, checkOutDate);
  
  const stayDuration = calculateNights();

  const primaryTeamReview = useMemo(
    () => reviewsData.find((r) => r.is_team_review),
    [reviewsData]
  );

  useEffect(() => {
    setGalleryUseOriginal(false);
  }, [currentImageIndex, property?.id]);

  /** Obfuscation uses randomness — memoize so gallery (re)renders don't change coords and remount the map. */
  const mapApproxCoords = useMemo(() => {
    if (!property?.latitude || !property?.longitude) return null;
    return obfuscateCoordinates(property.latitude, property.longitude);
  }, [property?.id, property?.latitude, property?.longitude]);

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
            .select(PROPERTY_DETAIL_PUBLIC_COLUMNS)
            .eq('id', params.id as string)
            .eq('status', 'active')
            .single();

          if (!error && data) {
            const d = data as unknown as Record<string, unknown>;
            propertyData = {
              ...d,
              wellnessFriendly: d.wellness_friendly,
              hostId: d.host_id,
              vibesbnb_take: d.vibesbnb_take,
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

        const defaultHostName = 'Property Host';
        const defaultHostImage = `https://api.dicebear.com/7.x/initials/svg?seed=${propertyData.host_id || 'host'}`;
        const smoking = resolveSmokingFlags(propertyData);
        const consumption = resolveWellnessConsumptionFlags(propertyData as Record<string, unknown>);

        const buildProperty = (
          reviews: any[],
          host: { hostName: string; hostImage: string; hostBio: string; hostJoinedDate: string }
        ): Property => {
          const avgRating =
            reviews.length > 0
              ? Number(
                  (reviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0) /
                    reviews.length).toFixed(1)
                )
              : 0;
          return {
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
            beds:
              propertyData.beds != null && propertyData.beds !== ''
                ? Number(propertyData.beds)
                : null,
            bathrooms: propertyData.bathrooms || 0,
            guests: propertyData.guests || 0,
            images: propertyData.images || [],
            amenities: propertyData.amenities || [],
            wellnessFriendly:
              propertyData.wellness_friendly || propertyData.wellnessFriendly || false,
            wellnessConsumptionIndoorAllowed: consumption.indoor,
            wellnessConsumptionOutdoorAllowed: consumption.outdoor,
            smokingInsideAllowed: smoking.inside,
            smokingOutsideAllowed: smoking.outside,
            rating: avgRating || Number(propertyData.rating || 0),
            reviews: reviews.length,
            createdAt:
              typeof propertyData.created_at === 'string'
                ? propertyData.created_at
                : null,
            hostId: propertyData.host_id || '',
            hostName: host.hostName,
            hostImage: host.hostImage,
            hostBio: host.hostBio,
            hostJoinedDate: host.hostJoinedDate,
            latitude: propertyData.latitude ? Number(propertyData.latitude) : undefined,
            longitude: propertyData.longitude ? Number(propertyData.longitude) : undefined,
            type: propertyData.type || 'Retreat',
            rooms: propertyData.rooms || [],
            vibesbnb_take: propertyData.vibesbnb_take,
            minBookingNights: normalizeMinBookingNights(
              propertyData.min_booking_nights ?? propertyData.minBookingNights
            ),
            allowDirectBooking: propertyData.allow_direct_booking === true,
            refundableDeposit:
              propertyData.refundable_deposit != null
                ? Number(propertyData.refundable_deposit)
                : 0,
            allowExtraGuests: propertyData.allow_extra_guests === true,
            extraGuestPrice:
              propertyData.extra_guest_price != null
                ? Number(propertyData.extra_guest_price)
                : 0,
          };
        };

        // Paint the page from the property row first; host + reviews hydrate in parallel (no waterfall).
        const initialHost = {
          hostName: defaultHostName,
          hostImage: defaultHostImage,
          hostBio: '',
          hostJoinedDate: '2024',
        };
        setProperty(buildProperty([], initialHost));
        setReviewsData([]);
        setLoading(false);

        if (isSupabaseConfigured) {
          const propertyId = params.id as string;
          try {
            const [profileResult, reviewsResult] = await Promise.all([
              propertyData.host_id
                ? supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, bio, created_at, role, host_badge')
                    .eq('id', propertyData.host_id)
                    .single()
                : Promise.resolve({ data: null as { full_name?: string | null; avatar_url?: string | null; bio?: string | null; created_at?: string } | null }),
              supabase
                .from('reviews')
                .select('*, profiles(full_name, avatar_url)')
                .eq('property_id', propertyId)
                .eq('status', 'approved')
                .order('created_at', { ascending: false }),
            ]);

            const profile = 'data' in profileResult ? profileResult.data : null;
            const rawReviews =
              'data' in reviewsResult && reviewsResult.data ? reviewsResult.data : [];
            const reviews = [...rawReviews].sort((a, b) => {
              if (a.is_team_review && !b.is_team_review) return -1;
              if (!a.is_team_review && b.is_team_review) return 1;
              return 0;
            });

            const host = {
              hostName: profile?.full_name || defaultHostName,
              hostImage: profile?.avatar_url || defaultHostImage,
              hostBio: profile?.bio || '',
              hostJoinedDate: profile?.created_at
                ? new Date(profile.created_at).getFullYear().toString()
                : '2024',
            };

            setProperty(buildProperty(reviews, host));
            setReviewsData(reviews);

            if (propertyData.host_id) {
              fetch('/api/hosts/badge-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostId: propertyData.host_id }),
              })
                .then((r) => (r.ok ? r.json() : null))
                .then((payload) => {
                  if (payload?.badge === 'superbud' || payload?.badge === 'vibesetter') {
                    setHostDisplayBadge(payload.badge);
                  }
                })
                .catch(() => {
                  /* non-blocking */
                });
            }
          } catch (e) {
            console.error('[Listing Detail] Error loading host profile or reviews:', e);
          }
        }
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

  const handleViewHostProfile = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!property?.hostId) {
      toast.error('Host profile unavailable');
      return;
    }
    router.push(`/users/${property.hostId}`);
  };

  const buildBookingPath = () => {
    const selectedRoomsParam =
      selectedRoomIds.length > 0 ? `&selectedUnits=${selectedRoomIds.join(',')}` : '';
    const dateParams = `${checkInDate ? `&checkIn=${checkInDate}` : ''}${checkOutDate ? `&checkOut=${checkOutDate}` : ''}`;
    const partyParams = `&guests=${partyAdults}&kids=${partyKids}&pets=${partyPets}`;
    return `/bookings/new?propertyId=${params.id}${selectedRoomsParam}${dateParams}${partyParams}`;
  };

  const handleBooking = () => {
    if (!property) return;

    if (!checkInDate || !checkOutDate || stayDuration <= 0) {
      toast.error('Select available check-in and check-out dates first.');
      return;
    }

    const minN = property.minBookingNights;
    if (minN != null && stayDuration < minN) {
      toast.error(`Minimum stay is ${minN} night${minN === 1 ? '' : 's'} for this property.`);
      return;
    }

    saveWellnessCartForBooking(
      params.id as string,
      wellnessCart.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        price: Number(i.price) || 0,
        image: i.image ?? null,
      }))
    );

    const bookingPath = buildBookingPath();

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(bookingPath)}`);
      return;
    }

    if (property.allowDirectBooking) {
      router.push(bookingPath);
      return;
    }

    setOpenBookingChat(true);
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

  const hostNightlyRate = calculateTotalPrice();
  const displayNightlyRate = hostNightlyRate;
  const selectedRoomsForQuote =
    property?.rooms?.filter((room) => selectedRoomIds.includes(room.id)) ?? [];
  const listingQuote =
    property && checkInDate && checkOutDate && stayDuration > 0
      ? buildBookingQuoteFromProperty({
          property: {
            price: property.price,
            cleaning_fee: property.cleaningFee,
            guests: property.guests,
            allow_extra_guests: property.allowExtraGuests,
            extra_guest_price: property.extraGuestPrice,
            refundable_deposit: property.refundableDeposit,
          },
          checkInYmd: checkInDate,
          checkOutYmd: checkOutDate,
          selectedUnits: selectedRoomsForQuote,
          adults: partyAdults,
          kids: partyKids,
          pets: partyPets,
          wellnessLineItems: wellnessCart,
          applyCardFee: property.allowDirectBooking === true,
        })
      : null;

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

  const heroRaw =
    property.images[currentImageIndex] ??
    property.images[0] ??
    PDP_IMAGE_PLACEHOLDER;
  const heroDisplaySrc =
    galleryUseOriginal || heroRaw.startsWith('data:') ? heroRaw : listingGalleryImageUrl(heroRaw);

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
              <PropertyListingRating
                rating={property.rating}
                reviewCount={property.reviews}
                createdAt={property.createdAt}
                onClick={scrollToReviews}
                starSize={18}
              />
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
          <div className="relative z-0 h-96 md:h-[500px] rounded-xl overflow-hidden bg-gray-900">
            <Image
              key={`${property.id}-${currentImageIndex}`}
              src={heroDisplaySrc}
              alt={`${property.name} - Image ${currentImageIndex + 1}`}
              fill
              priority={currentImageIndex === 0}
              fetchPriority={currentImageIndex === 0 ? 'high' : 'low'}
              sizes="(max-width: 1024px) 100vw, 50vw"
              quality={78}
              className="object-cover"
              placeholder="blur"
              blurDataURL={GALLERY_HERO_BLUR}
              unoptimized={heroRaw.startsWith('data:')}
              onError={() => {
                if (!galleryUseOriginal && heroDisplaySrc !== heroRaw) {
                  setGalleryUseOriginal(true);
                }
              }}
            />

            <div className="absolute top-4 left-4 z-[15] flex flex-col gap-2 items-start max-w-[min(100%,18rem)]">
              {property.wellnessFriendly && (
                <div className="bg-emerald-600 text-white px-4 py-2 rounded-full font-semibold shadow-lg">
                  🧘 Wellness-Friendly
                </div>
              )}
              <WellnessConsumptionPill indoor={property.wellnessConsumptionIndoorAllowed} outdoor={property.wellnessConsumptionOutdoorAllowed} />
              {property.smokingInsideAllowed && (
                <div className="flex items-center gap-2 bg-amber-600/95 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg border border-amber-400/30">
                  Smoking allowed inside
                </div>
              )}
              {property.smokingOutsideAllowed && (
                <div className="flex items-center gap-2 bg-slate-700/95 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg border border-white/15">
                  Smoking allowed outside
                </div>
              )}
            </div>

            {property.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 z-[5] -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 z-[5] -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 z-[5] -translate-x-1/2 flex gap-2">
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

          {/* Map - Shows approximate location only (coords memoized so photo carousel does not reset the map) */}
          {mapApproxCoords?.lat != null && mapApproxCoords?.lng != null && (
            <div className="h-96 md:h-[500px] rounded-xl overflow-hidden border border-gray-800 relative">
              <PropertyMap
                key={property.id}
                latitude={mapApproxCoords.lat}
                longitude={mapApproxCoords.lng}
                propertyName={property.name}
              />
              <div className="absolute bottom-4 left-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-3 border border-gray-700">
                <p className="text-sm text-gray-300 flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                  <span>Approximate location shown. Exact address provided after booking confirmation.</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Info — host, property type, capacity */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4 min-w-0 flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={property.hostImage}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-full object-cover border border-gray-700 bg-gray-800"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Hosted by</p>
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <p className="text-white font-semibold text-lg leading-tight truncate">{property.hostName}</p>
                      {hostDisplayBadge ? (
                        <HostStatusBadge badge={hostDisplayBadge} size="sm" />
                      ) : null}
                    </div>
                    {property.hostBio?.trim() ? (
                      <p className="text-sm text-gray-400 mt-2 leading-relaxed line-clamp-3">{property.hostBio.trim()}</p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">
                        {property.hostJoinedDate
                          ? `Hosting on VibesBNB since ${property.hostJoinedDate}`
                          : 'Your host for this stay'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 lg:shrink-0 lg:pt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 size={20} className="text-gray-400 shrink-0" />
                    <span className="text-white font-medium">{property.type || 'Property'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-gray-400 shrink-0" />
                    <span className="text-white">{property.guests} guests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed size={20} className="text-gray-400 shrink-0" />
                    <span className="text-white">{property.bedrooms} bedrooms</span>
                  </div>
                  {typeof property.beds === 'number' && property.beds >= 1 && (
                    <div className="flex items-center gap-2">
                      <Bed size={20} className="text-emerald-500/80 shrink-0" />
                      <span className="text-white">{property.beds} beds total</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Bath size={20} className="text-gray-400 shrink-0" />
                    <span className="text-white">{property.bathrooms} bathrooms</span>
                  </div>
                </div>
              </div>
              {(property.smokingInsideAllowed || property.smokingOutsideAllowed) && (
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-white/10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1">
                    Smoking
                  </span>
                  {property.smokingInsideAllowed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/20 text-amber-300 px-3 py-1 text-sm font-medium border border-amber-500/30">
                      Inside OK
                    </span>
                  )}
                  {property.smokingOutsideAllowed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 text-gray-200 px-3 py-1 text-sm font-medium border border-white/15">
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

            {/* Room/Unit Selection — only when the listing has multiple bookable units */}
            {property.rooms && property.rooms.length > 1 && (
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
                  <div
                    className={`grid grid-cols-1 gap-4 my-6 ${
                      primaryTeamReview ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'
                    }`}
                  >
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
                            {primaryTeamReview ? (
                              <>
                                This listing is <span className="text-white font-medium">verified by VibesBNB Trust & Safety</span>
                                {property.reviews > 1 ? (
                                  <>
                                    {' '}
                                    and has <span className="text-white font-medium">{property.reviews}</span> total{' '}
                                    {property.reviews === 1 ? 'review' : 'reviews'}.
                                  </>
                                ) : (
                                  '.'
                                )}
                              </>
                            ) : (
                              <>
                                Guests generally praise the <span className="text-white font-medium">cleanliness</span> and{' '}
                                <span className="text-white font-medium">amenities</span>. The average rating of{' '}
                                <span className="text-white font-medium">{property.rating}★</span> suggests an exceptional stay
                                experience based on {property.reviews} recent {property.reviews === 1 ? 'review' : 'reviews'}.
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 italic">There aren't many user reviews for this property yet. Be one of the first to share your experience!</span>
                        )}
                      </div>
                    </div>

                    {/* VibesBNB Approved — Trust & Safety team review */}
                    {primaryTeamReview && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                          <ShieldCheck size={48} className="text-purple-400" />
                        </div>
                        <div className="flex items-center gap-2 mb-3 text-purple-400 font-bold text-sm uppercase tracking-wider">
                          <ShieldCheck size={16} />
                          VibesBNB Approved
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < (primaryTeamReview.rating || 5)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-600'
                              }
                            />
                          ))}
                          <span className="text-gray-500 text-xs ml-1">
                            {primaryTeamReview.rating}/5 · Trust & Safety
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed relative z-10">
                          &ldquo;{primaryTeamReview.comment}&rdquo;
                        </p>
                        <p className="text-purple-400/80 text-xs mt-3 relative z-10 font-medium">
                          {primaryTeamReview.reviewer_name || 'VibesBNB Team'}
                        </p>
                      </div>
                    )}

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
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-gray-400 text-sm mb-3">
                    {hostDisplayBadge ? (
                      <HostStatusBadge badge={hostDisplayBadge} size="md" />
                    ) : null}
                    {property.hostJoinedDate ? (
                      <>
                        {hostDisplayBadge ? <span className="text-gray-600">•</span> : null}
                        <span>Joined in {property.hostJoinedDate}</span>
                      </>
                    ) : null}
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                    {property.hostBio || "Hi, I'm your host! I love sharing my unique spaces and helping travelers feel at home while exploring the vibes of the city."}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                    <button
                      type="button"
                      onClick={handleViewHostProfile}
                      className="px-6 py-2.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-primary-500 transition-all shadow-lg"
                    >
                      Check Profile
                    </button>
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
                  <span className="text-3xl font-bold text-white">${displayNightlyRate}</span>
                  <span className="text-gray-400">/ night</span>
                </div>
                <PropertyListingRating
                  rating={property.rating}
                  reviewCount={property.reviews}
                  createdAt={property.createdAt}
                  onClick={scrollToReviews}
                  starSize={16}
                  className="text-sm"
                />
                {property.minBookingNights != null && (
                  <p className="text-sm text-amber-200/90 mt-3 flex items-center gap-2">
                    <Calendar size={14} className="shrink-0" aria-hidden />
                    {minNightsLabel(property.minBookingNights)}
                  </p>
                )}
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
                    {property.minBookingNights != null &&
                      stayDuration < property.minBookingNights && (
                        <p className="text-xs text-amber-300 mt-2">
                          {minNightsLabel(property.minBookingNights)} — adjust your dates to continue.
                        </p>
                      )}
                  </div>
                )}
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">
                    Adults
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={partyAdults}
                    onChange={(e) =>
                      setPartyAdults(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">
                    Kids
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={partyKids}
                    onChange={(e) =>
                      setPartyKids(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">
                    Pets
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={partyPets}
                    onChange={(e) =>
                      setPartyPets(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleBooking}
                disabled={!!(user && property?.hostId && String(property.hostId) === String(user.id))}
                className="w-full px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition font-semibold text-lg mb-4"
              >
                <Calendar size={20} className="inline mr-2" />
                {user && property?.hostId && String(property.hostId) === String(user.id)
                  ? 'You are the host'
                  : checkInDate && checkOutDate
                    ? 'Request to book'
                    : 'Check Availability'}
              </button>

              <PropertyChatButton
                propertyId={property.id}
                propertyName={property.name}
                checkIn={checkInDate || undefined}
                checkOut={checkOutDate || undefined}
                selectedUnitIds={selectedRoomIds}
                autoOpen={openBookingChat}
                onAutoOpenConsumed={() => setOpenBookingChat(false)}
              />

              <div className="text-center text-sm text-gray-400">
                {property.allowDirectBooking
                  ? 'You can complete payment right after submitting your request.'
                  : 'Message the host first — after they approve, you can pay to secure your stay.'}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                {listingQuote && property && checkInDate && checkOutDate ? (
                  <ReservationQuote
                    propertyName={property.name}
                    checkInYmd={checkInDate}
                    checkOutYmd={checkOutDate}
                    quote={listingQuote}
                    selectedUnits={
                      selectedRoomsForQuote.length > 0 ? selectedRoomsForQuote : undefined
                    }
                    showCardFee={property.allowDirectBooking === true}
                    compact
                  />
                ) : (
                  <p className="text-gray-400 text-sm text-center">Select dates to see your quote</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
