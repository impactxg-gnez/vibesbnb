'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/search/SearchBar';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface Listing {
  id: string;
  title?: string;
  name?: string;
  location: string;
  price: number;
  rating?: number;
  images: string[];
  type?: string;
  amenities?: string[];
  guests?: number;
  status?: string;
  [key: string]: any;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            rating: p.rating ? Number(p.rating) : 4.5,
            images: images,
            type: p.type || 'Property',
            amenities: p.amenities || [],
            guests: p.guests || 0,
            status: p.status || 'active',
          };
        });

        // Filter by location
        if (location) {
          filteredListings = filteredListings.filter(listing =>
            listing.location.toLowerCase().includes(location.toLowerCase())
          );
        }

        // Filter by guest count - show properties that allow selected guests or more
        if (totalOccupancy > 0) {
          filteredListings = filteredListings.filter(listing => {
            const propertyGuests = listing.guests || 0;
            return propertyGuests >= totalOccupancy;
          });
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
      <div className="bg-emerald-600 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-white mb-6">Find Your Perfect Stay</h1>
          <SearchBar />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-300">
            {loading ? 'Searching...' : `${listings.length} properties found`}
          </p>
          <select className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Rating: High to Low</option>
            <option>Most Recent</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="animate-pulse">
                <div className="bg-gray-800 h-64 rounded-xl mb-3"></div>
                <div className="bg-gray-800 h-4 rounded w-3/4 mb-2"></div>
                <div className="bg-gray-800 h-4 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold text-white mb-2">No properties found</h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your search criteria or browse all available properties
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              Browse All Properties
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 hover:shadow-xl hover:border-emerald-500/50 transition"
              >
                <div className="relative h-64 bg-gray-800">
                  {listing.images && listing.images[0] ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title || 'Property'}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/800x600/1a1a1a/ffffff?text=Image+Failed+to+Load';
                        target.onerror = null; // Prevent infinite loop
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <span>No Image</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Wellness-Friendly
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white text-lg group-hover:text-emerald-500">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-medium text-gray-100">{listing.rating?.toFixed(1) || '4.5'}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{listing.location}</p>
                  {listing.guests && (
                    <p className="text-gray-500 text-xs mb-2">Up to {listing.guests} guests</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(listing.amenities || []).slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                  <p className="text-white font-bold text-lg">
                    ${listing.price} <span className="font-normal text-gray-400 text-sm">/ night</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
