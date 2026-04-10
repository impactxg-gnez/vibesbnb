'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SearchSection } from '@/components/home/SearchSection';
import Filters from '@/components/search/Filters';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import PropertiesMap from '@/components/PropertiesMap';
import { DatePicker } from '@/components/ui/DatePicker';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  enumerateStayNightsYmd,
  formatCalendarDate,
  nightsBetweenYmd,
  todayLocalYmd,
} from '@/lib/dateUtils';

interface Listing {
  id: string;
  title: string;
  name: string;
  location: string;
  price: number;
  rating?: number;
  reviews?: number;
  images: string[];
  type?: string;
  amenities?: string[];
  guests?: number;
  bedrooms?: number;
  status?: 'active' | 'draft' | 'inactive';
  coordinates?: { lat: number; lng: number };
  isAvailable?: boolean;
  [key: string]: any;
}

function calculateNights(checkIn: string, checkOut: string): number {
  return nightsBetweenYmd(checkIn, checkOut);
}

function formatDateShort(dateStr: string): string {
  return formatCalendarDate(dateStr, { month: 'short', day: 'numeric' });
}

// Listing Card Component with Image Carousel
function ListingCard({ listing, onHover, checkIn, checkOut }: { listing: Listing, onHover: (id: string | null) => void, checkIn?: string, checkOut?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfFavorited();
    }
  }, [user, listing.id]);

  const checkIfFavorited = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user?.id)
        .eq('property_id', listing.id)
        .single();
      
      if (data && !error) {
        setIsFavorited(true);
      }
    } catch (error) {
      // Not favorited or error
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to save favorites');
      router.push('/login');
      return;
    }

    setLoadingFavorite(true);
    try {
      const supabase = createClient();
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', listing.id);
        
        if (error) throw error;
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            property_id: listing.id
          });
        
        if (error) throw error;
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    } finally {
      setLoadingFavorite(false);
    }
  };

  const images = listing.images && listing.images.length > 0 ? listing.images : ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image'];
  
  // Build the listing URL with date params if available
  const listingUrl = `/listings/${listing.id}${checkIn || checkOut ? `?${checkIn ? `checkIn=${checkIn}` : ''}${checkIn && checkOut ? '&' : ''}${checkOut ? `checkOut=${checkOut}` : ''}` : ''}`;
  
  // Calculate stay info
  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;
  const totalPrice = nights > 0 ? listing.price * nights : listing.price;

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      className="group card flex flex-col h-full bg-surface border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors"
    >
      <Link href={listingUrl} className="block relative">
        <div className="relative h-64 bg-surface-light overflow-hidden">
          <img
            src={images[currentImageIndex]}
            alt={listing.title || 'Property'}
            className="w-full h-full object-cover transition-transform duration-500"
          />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Badges */}
          {/* Heart Button */}
          <button 
            onClick={toggleFavorite}
            disabled={loadingFavorite}
            className={`absolute top-4 left-4 p-2.5 backdrop-blur-md rounded-full border transition-all duration-300 group/heart ${
              isFavorited 
                ? 'bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                : 'bg-surface-dark/40 border-white/10 text-white hover:bg-rose-500/20 hover:border-rose-500/50'
            }`}
          >
            <Heart 
              size={18} 
              className={`transition-all duration-300 ${isFavorited ? 'fill-current scale-110' : 'group-hover/heart:scale-110'}`} 
            />
          </button>
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            {/* Availability Badge - only show when dates are selected */}
            {checkIn && checkOut && listing.isAvailable !== undefined && (
              <div className={`backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border text-xs font-bold ${
                listing.isAvailable 
                  ? 'bg-emerald-500/80 border-emerald-400/50 text-white' 
                  : 'bg-red-500/80 border-red-400/50 text-white'
              }`}>
                {listing.isAvailable ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Available
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Unavailable
                  </>
                )}
              </div>
            )}
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <span className="text-lg">🌿</span>
              <div className="flex flex-col text-[10px] leading-tight font-bold text-white">
                <span className="flex items-center gap-1">
                  INDOOR <span className="text-green-400">✓</span>
                </span>
                <span className="flex items-center gap-1">
                  OUTDOOR <span className="text-green-400">✓</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 bg-surface-dark overflow-x-auto scrollbar-hide border-b border-white/5">
          {images.slice(0, 5).map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentImageIndex(idx);
              }}
              className={`relative w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                idx === currentImageIndex 
                  ? 'ring-2 ring-primary-500 opacity-100' 
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Link href={listingUrl} className="flex-1 p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-white text-lg mb-1 group-hover:text-primary-500 transition-colors line-clamp-1">
              {listing.title}
            </h3>
            <p className="text-muted text-sm line-clamp-1">
              {listing.type ? `${listing.type} in ` : ''}{listing.location}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg flex-shrink-0">
            <span className={listing.reviews && listing.reviews > 0 ? "text-primary-500 text-xs" : "text-gray-500 text-xs"}>★</span>
            <span className="text-xs font-bold text-white">
              {listing.reviews && listing.reviews > 0 ? listing.rating?.toFixed(1) : 'New'}
            </span>
          </div>
        </div>

        {/* Beds and Guests Info */}
        <div className="flex items-center gap-4 mt-3 text-muted text-sm">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {listing.bedrooms || 1} {(listing.bedrooms || 1) === 1 ? 'bed' : 'beds'}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {listing.guests || 2} guests
          </span>
        </div>

        {/* Selected Dates Display */}
        {checkIn && checkOut && nights > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-white font-medium">
              {formatDateShort(checkIn)} - {formatDateShort(checkOut)}
            </span>
            <span className="text-muted">({nights} {nights === 1 ? 'night' : 'nights'})</span>
          </div>
        )}
        
        <div className="flex items-end justify-between mt-4">
          {nights > 0 ? (
            <div>
              <p className="text-white font-bold text-xl">
                ${totalPrice} <span className="font-normal text-muted text-xs">total</span>
              </p>
              <p className="text-muted text-xs">${listing.price} × {nights} nights</p>
            </div>
          ) : (
            <p className="text-white font-bold text-xl">
              ${listing.price} <span className="font-normal text-muted text-xs">/ night</span>
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [sortBy, setSortBy] = useState('Price: High to Low');
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>({
    typeOfPlace: 'any',
    priceRange: [0, 100000],
    rooms: 0,
    beds: 0,
    bathrooms: 0,
    propertyTypes: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    amenities: []
  });
  
  // Get selected dates from URL
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const hasDateFilter = !!(checkIn && checkOut);
  const nights = hasDateFilter ? calculateNights(checkIn, checkOut) : 0;
  
  // Filter listings based on availability toggle
  const displayedListings = hideUnavailable 
    ? listings.filter(l => l.isAvailable !== false)
    : listings;
  
  const availableCount = listings.filter(l => l.isAvailable !== false).length;
  const unavailableCount = listings.filter(l => l.isAvailable === false).length;

  // Sync URL categories to activeFilters
  useEffect(() => {
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    if (JSON.stringify(categories) !== JSON.stringify(activeFilters.propertyTypes)) {
      setActiveFilters((prev: any) => ({
        ...prev,
        propertyTypes: categories
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    // ... existing useEffect logic ...
    const loadAndFilterProperties = async () => {
      setLoading(true);

      // Get search parameters
      const location = searchParams.get('location') || '';
      const guests = parseInt(searchParams.get('guests') || '0');
      const kids = parseInt(searchParams.get('kids') || '0');
      const pets = parseInt(searchParams.get('pets') || '0');
      const totalOccupancy = guests + kids;
      const checkIn = searchParams.get('checkIn') || '';
      const checkOut = searchParams.get('checkOut') || '';

      try {
        const supabase = createClient();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const isSupabaseConfigured = supabaseUrl &&
          supabaseUrl !== '' &&
          supabaseUrl !== 'https://placeholder.supabase.co' &&
          supabaseKey &&
          supabaseKey !== '' &&
          supabaseKey !== 'placeholder-key';

        let propertiesData: any[] = [];
        let supabaseErrorOccurred = false;

        if (isSupabaseConfigured) {
          // Fetch active properties from Supabase
          let query = supabase
            .from('properties')
            .select('*')
            .eq('status', 'active');

          const { data, error } = await query;

          if (error) {
            console.error('[Search] Error loading properties from Supabase:', error);
            supabaseErrorOccurred = true;
          } else {
            propertiesData = data || [];
          }
        }

        // Fallback to localStorage if Supabase is not configured or query failed
        if (!isSupabaseConfigured || supabaseErrorOccurred) {
          console.log('[Search] Loading properties from localStorage fallback');
          const allProperties: any[] = [];

          // Check all localStorage keys for properties
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('properties_')) {
              try {
                const userProperties = JSON.parse(localStorage.getItem(key) || '[]');
                // Only include active properties
                const activeProperties = userProperties.filter((p: any) =>
                  p.status === 'active' || !p.status // Include properties without status as active
                );
                allProperties.push(...activeProperties);
              } catch (e) {
                console.error('[Search] Error parsing localStorage properties:', e);
              }
            }
          });

          if (allProperties.length > 0) {
            propertiesData = allProperties;
            console.log('[Search] Found', allProperties.length, 'properties from localStorage');
          }
        }

        // Helper function to normalize image URLs
        const normalizeImageUrl = (url: string): string => {
          if (!url || typeof url !== 'string') {
            return 'https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available';
          }

          // If it's already a data URL or placeholder, return as-is
          if (url.startsWith('data:') || url.startsWith('https://via.placeholder.com')) {
            return url;
          }

          // If it's already a valid absolute URL, return as-is
          try {
            new URL(url);
            return url;
          } catch (e) {
            // Not a valid absolute URL, return placeholder
            console.warn('[Search] Invalid image URL:', url);
            return 'https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available';
          }
        };

        // Transform Supabase data to Listing format
        let filteredListings: Listing[] = (propertiesData || []).map((p: any) => {
          // Debug: Log coordinates extraction
          if (p.latitude && p.longitude) {
            console.log('[Search] Property has coordinates:', {
              id: p.id,
              name: p.name,
              latitude: p.latitude,
              longitude: p.longitude,
            });
          }
          // Normalize and filter images
          const rawImages = p.images || [];
          const normalizedImages = rawImages
            .map(normalizeImageUrl)
            .filter((img: string) => img && img.length > 0);

          // Ensure at least one image
          const images = normalizedImages.length > 0
            ? normalizedImages
            : ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image+Available'];

          return {
            id: p.id,
            name: p.name || p.title || 'Untitled Property',
            title: p.name || p.title || 'Untitled Property',
            location: p.location || '',
            price: p.price ? Number(p.price) : 0,
            rating: p.rating ? Number(p.rating) : 0,
            reviews: p.reviews_count || 0,
            images: images,
            type: p.type || 'Property',
            amenities: p.amenities || [],
            guests: p.guests || 0,
            bedrooms: p.bedrooms || 0,
            status: p.status || 'active',
            coordinates: p.coordinates ? {
              lat: Number(p.coordinates.lat),
              lng: Number(p.coordinates.lng),
            } : (p.latitude && p.longitude ? {
              lat: Number(p.latitude),
              lng: Number(p.longitude),
            } : undefined),
          };
        });

        // Filter by location - more lenient matching
        if (location) {
          const searchTerms = location.toLowerCase().split(/[,\s]+/).filter(term => term.length > 1);
          filteredListings = filteredListings.filter(listing => {
            const listingLoc = listing.location.toLowerCase();
            const listingName = listing.name.toLowerCase();

            // Check if any search term matches location OR name
            return searchTerms.some(term => listingLoc.includes(term) || listingName.includes(term)) ||
              listingLoc.includes(location.toLowerCase());
          });
        }

        // Filter by guest count - show properties that allow selected guests or more
        // If property has 0 guests (not set), we show it only if totalOccupancy is 1
        if (totalOccupancy > 0) {
          filteredListings = filteredListings.filter(listing => {
            const propertyGuests = listing.guests || 0;
            if (propertyGuests === 0) return totalOccupancy <= 2; // Assume typical capacity if not set
            return propertyGuests >= totalOccupancy;
          });
        }

        // Check availability if dates are selected
        if (checkIn && checkOut && isSupabaseConfigured) {
          try {
            const datesToCheck = enumerateStayNightsYmd(checkIn, checkOut);

            if (datesToCheck.length > 0) {
              // Fetch blocked/booked dates for all properties in our list
              const propertyIds = filteredListings.map(l => l.id);
              const supabase = createClient();
              
              const { data: blockedDates, error: availError } = await supabase
                .from('property_availability')
                .select('property_id, day, status')
                .in('property_id', propertyIds)
                .in('day', datesToCheck)
                .in('status', ['blocked', 'booked']);

              if (!availError && blockedDates) {
                // Create a set of property IDs that have blocked dates
                const unavailablePropertyIds = new Set<string>();
                blockedDates.forEach((block: any) => {
                  unavailablePropertyIds.add(block.property_id);
                });

                // Mark properties as available or not
                filteredListings = filteredListings.map(listing => ({
                  ...listing,
                  isAvailable: !unavailablePropertyIds.has(listing.id)
                }));

                // Filter to only show available properties (move unavailable to end or hide)
                // Sort: available first, then unavailable
                filteredListings.sort((a, b) => {
                  if (a.isAvailable && !b.isAvailable) return -1;
                  if (!a.isAvailable && b.isAvailable) return 1;
                  return 0;
                });
              }
            }
          } catch (availError) {
            console.warn('[Search] Error checking availability:', availError);
          }
        }

        // Filter by Price Range
        if (activeFilters.priceRange) {
          filteredListings = filteredListings.filter(listing => 
            listing.price >= activeFilters.priceRange[0] && 
            listing.price <= activeFilters.priceRange[1]
          );
        }

        // Filter by Rooms/Beds/Baths
        if (activeFilters.rooms > 0) {
          filteredListings = filteredListings.filter(listing => (listing.bedrooms || 0) >= activeFilters.rooms);
        }
        if (activeFilters.beds > 0) {
          filteredListings = filteredListings.filter(listing => (listing.beds || listing.bedrooms || 0) >= activeFilters.beds);
        }
        if (activeFilters.bathrooms > 0) {
          filteredListings = filteredListings.filter(listing => (listing.bathrooms || 0) >= activeFilters.bathrooms);
        }

        // Filter by Property Type
        // Filter by Property Type (Robust mapping between categories and property types)
        if (activeFilters.propertyTypes && activeFilters.propertyTypes.length > 0) {
          filteredListings = filteredListings.filter(listing => {
            const listingType = listing.type || 'Property';
            
            // Exact match or mapped match
            return activeFilters.propertyTypes.some((type: string) => {
              if (type === 'House' || type === 'Entire House') {
                return listingType.toLowerCase().includes('house') || listingType === 'Property';
              }
              if (type === 'Apartment') {
                return listingType.toLowerCase().includes('apartment');
              }
              if (type === 'Condo') {
                return listingType.toLowerCase().includes('condo');
              }
              if (type === 'Private Room') {
                return listingType.toLowerCase().includes('private room') || listingType.toLowerCase().includes('private rooms');
              }
              return listingType === type;
            });
          });
        }

        // Filter by Amenities
        if (activeFilters.amenities && activeFilters.amenities.length > 0) {
          filteredListings = filteredListings.filter(listing => 
            activeFilters.amenities.every((a: string) => listing.amenities?.includes(a))
          );
        }

        // Filter by Type of Place
        if (activeFilters.typeOfPlace === 'room') {
          filteredListings = filteredListings.filter(listing => listing.type?.toLowerCase().includes('room'));
        } else if (activeFilters.typeOfPlace === 'entire') {
          filteredListings = filteredListings.filter(listing => listing.type?.toLowerCase().includes('house') || listing.type?.toLowerCase().includes('apartment') || listing.type?.toLowerCase().includes('condo'));
        }

        // Sort listings
        const sortParam = searchParams.get('sort') || 'high-low';
        if (sortParam === 'low-high') {
          // Keep availability sorting as secondary, price as primary
          filteredListings.sort((a, b) => {
            if (checkIn && checkOut) {
              if (a.isAvailable && !b.isAvailable) return -1;
              if (!a.isAvailable && b.isAvailable) return 1;
            }
            return a.price - b.price;
          });
          setSortBy('Price: Low to High');
        } else if (sortParam === 'high-low') {
          filteredListings.sort((a, b) => {
            if (checkIn && checkOut) {
              if (a.isAvailable && !b.isAvailable) return -1;
              if (!a.isAvailable && b.isAvailable) return 1;
            }
            return b.price - a.price;
          });
          setSortBy('Price: High to Low');
        } else if (sortParam === 'recent') {
          filteredListings.sort((a, b) => {
            if (checkIn && checkOut) {
              if (a.isAvailable && !b.isAvailable) return -1;
              if (!a.isAvailable && b.isAvailable) return 1;
            }
            return b.id.localeCompare(a.id);
          });
          setSortBy('Most Recent');
        }

        setListings(filteredListings);
      } catch (error) {
        console.error('Error loading properties:', error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    loadAndFilterProperties();
  }, [searchParams, activeFilters]);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-emerald-600 py-4 md:py-8">
        <div className="container mx-auto px-3 md:px-4">
          <SearchSection
            enableNegativeMargin={false}
            initialValues={{
              location: searchParams.get('location') || '',
              checkIn: searchParams.get('checkIn') || '',
              checkOut: searchParams.get('checkOut') || '',
              guests: parseInt(searchParams.get('guests') || '1'),
              kids: parseInt(searchParams.get('kids') || '0'),
              pets: parseInt(searchParams.get('pets') || '0'),
              categories: searchParams.get('categories')?.split(',') || []
            }}
          />
        </div>
      </div>

      <div className="px-3 md:px-6 py-4 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
          {/* Listings Column */}
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white">
                  {loading ? 'Searching...' : `${displayedListings.length} stays in ${searchParams.get('location') || 'all locations'}`}
                </h2>
                {/* Show selected dates summary */}
                {hasDateFilter && !loading && (
                  <p className="text-sm text-primary-500 mt-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDateShort(checkIn)} - {formatDateShort(checkOut)} ({nights} {nights === 1 ? 'night' : 'nights'})
                    {unavailableCount > 0 && (
                      <span className="text-muted">
                        • {availableCount} available
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowDatePicker(!showDatePicker);
                      setShowGuestPicker(false);
                    }}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-surface border border-white/10 rounded-full text-sm hover:bg-surface-light transition-all"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Dates</span>
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 p-4 min-w-[280px]">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Check In</label>
                          <DatePicker
                            value={searchParams.get('checkIn') || ''}
                            onChange={(dateStr) => {
                              const params = new URLSearchParams(searchParams.toString());
                              if (dateStr) params.set('checkIn', dateStr);
                              else params.delete('checkIn');
                              router.push(`/search?${params.toString()}`);
                            }}
                            min={todayLocalYmd()}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Check Out</label>
                          <DatePicker
                            value={searchParams.get('checkOut') || ''}
                            onChange={(dateStr) => {
                              const params = new URLSearchParams(searchParams.toString());
                              if (dateStr) params.set('checkOut', dateStr);
                              else params.delete('checkOut');
                              router.push(`/search?${params.toString()}`);
                            }}
                            min={searchParams.get('checkIn') || todayLocalYmd()}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="mt-4 w-full px-4 py-2 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-400 transition"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowGuestPicker(!showGuestPicker);
                      setShowDatePicker(false);
                    }}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-surface border border-white/10 rounded-full text-sm hover:bg-surface-light transition-all"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden sm:inline">Guests</span>
                  </button>
                  {showGuestPicker && (
                    <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 p-4 min-w-[240px]">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white text-sm font-semibold">Adults</span>
                            <p className="text-gray-400 text-xs">Ages 13+</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                const currentGuests = parseInt(searchParams.get('guests') || '1');
                                if (currentGuests > 1) {
                                  const params = new URLSearchParams(searchParams.toString());
                                  params.set('guests', (currentGuests - 1).toString());
                                  router.push(`/search?${params.toString()}`);
                                }
                              }}
                              className="w-8 h-8 rounded-lg border border-white/10 text-white hover:bg-white/10 flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="text-white font-semibold w-6 text-center">{searchParams.get('guests') || '1'}</span>
                            <button
                              onClick={() => {
                                const currentGuests = parseInt(searchParams.get('guests') || '1');
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('guests', (currentGuests + 1).toString());
                                router.push(`/search?${params.toString()}`);
                              }}
                              className="w-8 h-8 rounded-lg border border-white/10 text-white hover:bg-white/10 flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowGuestPicker(false)}
                        className="mt-4 w-full px-4 py-2 bg-primary-500 text-black rounded-lg font-semibold hover:bg-primary-400 transition"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams.toString());
                    if (e.target.value === 'Price: Low to High') {
                      params.set('sort', 'low-high');
                    } else if (e.target.value === 'Price: High to Low') {
                      params.set('sort', 'high-low');
                    } else {
                      params.set('sort', 'recent');
                    }
                    router.push(`/search?${params.toString()}`);
                  }}
                  className="px-3 md:px-4 py-2 bg-surface border border-white/10 text-white rounded-full text-xs md:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                >
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Most Recent</option>
                </select>
                {/* Hide unavailable toggle - only show when dates are selected */}
                {hasDateFilter && unavailableCount > 0 && (
                  <button
                    onClick={() => setHideUnavailable(!hideUnavailable)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
                      hideUnavailable 
                        ? 'bg-primary-500 text-black' 
                        : 'bg-surface border border-white/10 text-white hover:bg-surface-light'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {hideUnavailable ? 'Showing available only' : 'Hide unavailable'}
                  </button>
                )}
                <button
                  onClick={() => setShowFiltersModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-black rounded-full text-sm font-bold shadow-[0_10px_20px_rgba(0,230,118,0.2)] hover:bg-primary-400 transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Filters
                  {(activeFilters.rooms > 0 || activeFilters.propertyTypes.length > 0 || activeFilters.amenities.length > 0 || activeFilters.priceRange[0] > 0) && (
                    <span className="w-5 h-5 bg-black text-primary-500 rounded-full text-[10px] flex items-center justify-center border border-primary-500/50">
                      {(activeFilters.propertyTypes.length + activeFilters.amenities.length + (activeFilters.rooms > 0 ? 1 : 0))}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Filters Modal Overlay */}
            {showFiltersModal && (
              <div className="fixed inset-0 z-[100] flex justify-end">
                <div 
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => setShowFiltersModal(false)}
                />
                <div className="relative w-full max-w-xl bg-gray-950 shadow-2xl animate-in slide-in-from-right duration-300">
                  <Filters 
                    initialFilters={activeFilters}
                    onClose={() => setShowFiltersModal(false)}
                    onApply={(filters) => {
                      setActiveFilters(filters);
                      setShowFiltersModal(false);
                    }}
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="animate-pulse">
                    <div className="bg-surface h-72 rounded-3xl mb-3"></div>
                    <div className="bg-surface h-4 rounded w-3/4 mb-2"></div>
                    <div className="bg-surface h-4 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : displayedListings.length === 0 ? (
              <div className="bg-surface border border-white/5 rounded-3xl p-12 text-center shadow-xl">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {hideUnavailable && listings.length > 0 
                    ? 'No available properties for these dates' 
                    : 'No properties found'}
                </h3>
                <p className="text-muted mb-6">
                  {hideUnavailable && listings.length > 0 
                    ? 'Try different dates or show all properties including unavailable ones'
                    : 'Try adjusting your search criteria or browse all available properties'}
                </p>
                {hideUnavailable && listings.length > 0 ? (
                  <button
                    onClick={() => setHideUnavailable(false)}
                    className="btn-primary"
                  >
                    Show All Properties
                  </button>
                ) : (
                  <Link
                    href="/search"
                    className="btn-primary"
                  >
                    Browse All Properties
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedListings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing}
                    onHover={setHoveredListingId}
                    checkIn={checkIn || undefined}
                    checkOut={checkOut || undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Map Column */}
          <div className="hidden lg:block lg:w-1/2 order-1 lg:order-2 sticky top-[100px] h-[calc(100vh-140px)]">
            <PropertiesMap 
              properties={displayedListings} 
              className="w-full h-full rounded-3xl border border-white/10 shadow-2xl" 
              hoveredListingId={hoveredListingId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
