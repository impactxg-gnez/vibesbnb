'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchSection } from '@/components/home/SearchSection';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import PropertiesMap from '@/components/PropertiesMap';

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
  status?: 'active' | 'draft' | 'inactive';
  coordinates?: { lat: number; lng: number };
  [key: string]: any;
}

// Listing Card Component with Image Carousel
function ListingCard({ listing, onHover, checkIn, checkOut }: { listing: Listing, onHover: (id: string | null) => void, checkIn?: string, checkOut?: string }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = listing.images && listing.images.length > 0 ? listing.images : ['https://via.placeholder.com/800x600/1a1a1a/ffffff?text=No+Image'];
  
  // Build the listing URL with date params if available
  const listingUrl = `/listings/${listing.id}${checkIn || checkOut ? `?${checkIn ? `checkIn=${checkIn}` : ''}${checkIn && checkOut ? '&' : ''}${checkOut ? `checkOut=${checkOut}` : ''}` : ''}`;

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
          <div className="absolute top-4 left-4 p-2 bg-surface-dark/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:text-primary-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
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
            <p className="text-muted text-sm line-clamp-1">{listing.location}</p>
          </div>
          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg flex-shrink-0">
            <span className={listing.reviews && listing.reviews > 0 ? "text-primary-500 text-xs" : "text-gray-500 text-xs"}>★</span>
            <span className="text-xs font-bold text-white">
              {listing.reviews && listing.reviews > 0 ? listing.rating?.toFixed(1) : 'New'}
            </span>
          </div>
        </div>
        
        <div className="flex items-end justify-between mt-4">
          <p className="text-white font-bold text-xl">
            ${listing.price} <span className="font-normal text-muted text-xs">/ night</span>
          </p>
          <span className="text-muted text-xs font-medium">Up to {listing.guests} guests</span>
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

        // Sort listings
        const sortParam = searchParams.get('sort') || 'high-low';
        if (sortParam === 'low-high') {
          filteredListings.sort((a, b) => a.price - b.price);
          setSortBy('Price: Low to High');
        } else if (sortParam === 'high-low') {
          filteredListings.sort((a, b) => b.price - a.price);
          setSortBy('Price: High to Low');
        } else if (sortParam === 'recent') {
          filteredListings.sort((a, b) => {
            // Sort by ID or creation date if available
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
  }, [searchParams]);

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
              <h2 className="text-lg md:text-2xl font-bold text-white">
                {loading ? 'Searching...' : `${listings.length} stays in ${searchParams.get('location') || 'all locations'}`}
              </h2>
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
                          <input
                            type="date"
                            value={searchParams.get('checkIn') || ''}
                            onChange={(e) => {
                              const params = new URLSearchParams(searchParams.toString());
                              if (e.target.value) params.set('checkIn', e.target.value);
                              else params.delete('checkIn');
                              router.push(`/search?${params.toString()}`);
                            }}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Check Out</label>
                          <input
                            type="date"
                            value={searchParams.get('checkOut') || ''}
                            onChange={(e) => {
                              const params = new URLSearchParams(searchParams.toString());
                              if (e.target.value) params.set('checkOut', e.target.value);
                              else params.delete('checkOut');
                              router.push(`/search?${params.toString()}`);
                            }}
                            min={searchParams.get('checkIn') || new Date().toISOString().split('T')[0]}
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
              </div>
            </div>

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
            ) : listings.length === 0 ? (
              <div className="bg-surface border border-white/5 rounded-3xl p-12 text-center shadow-xl">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-semibold text-white mb-2">No properties found</h3>
                <p className="text-muted mb-6">
                  Try adjusting your search criteria or browse all available properties
                </p>
                <Link
                  href="/search"
                  className="btn-primary"
                >
                  Browse All Properties
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {listings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing}
                    onHover={setHoveredListingId}
                    checkIn={searchParams.get('checkIn') || undefined}
                    checkOut={searchParams.get('checkOut') || undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Map Column */}
          <div className="hidden lg:block lg:w-1/2 order-1 lg:order-2 sticky top-[100px] h-[calc(100vh-140px)]">
            <PropertiesMap 
              properties={listings} 
              className="w-full h-full rounded-3xl border border-white/10 shadow-2xl" 
              hoveredListingId={hoveredListingId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
