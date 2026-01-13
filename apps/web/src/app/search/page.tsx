'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/search/SearchBar';
import PropertiesMap from '@/components/PropertiesMap';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface Listing {
  id: string;
  title: string;
  name: string;
  location: string;
  price: number;
  rating?: number;
  images: string[];
  type?: string;
  amenities?: string[];
  guests?: number;
  status?: 'active' | 'draft' | 'inactive';
  coordinates?: { lat: number; lng: number };
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

      <div className="px-6 py-8">
        <div className="flex gap-8">
          {/* Listings Column */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                {loading ? 'Searching...' : `${listings.length} stays in ${searchParams.get('location') || 'all locations'}`}
              </h2>
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-full text-sm hover:bg-surface-light transition-all">
                  <span>📅</span> Dates
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-full text-sm hover:bg-surface-light transition-all">
                  <span>👤</span> Guests
                </button>
                <select className="px-4 py-2 bg-surface border border-white/10 text-white rounded-full text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all">
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
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="group card"
                  >
                    <div className="relative h-72 bg-surface-light">
                      {listing.images && listing.images[0] ? (
                        <img
                          src={listing.images[0]}
                          alt={listing.title || 'Property'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/800x600/1a1a1a/ffffff?text=Image+Failed+to+Load';
                            target.onerror = null;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted">
                          <span>No Image</span>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 p-2 bg-surface-dark/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:text-primary-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <div className="absolute top-4 left-4 bg-primary-500 text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg">
                        Wellness-Friendly
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-white text-xl mb-1 group-hover:text-primary-500 transition-colors">
                            {listing.title}
                          </h3>
                          <p className="text-muted text-sm">{listing.location}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                          <span className="text-primary-500 text-xs text-sm">★</span>
                          <span className="text-xs font-bold text-white">{listing.rating?.toFixed(1) || '4.5'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-6">
                         <p className="text-white font-bold text-2xl">
                          ${listing.price} <span className="font-normal text-muted text-sm">/ night</span>
                        </p>
                        <div className="flex-1" />
                        <span className="text-muted text-xs font-medium">Up to {listing.guests} guests</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Map Column */}
          <div className="hidden lg:block w-[450px] sticky top-[100px] h-[calc(100vh-140px)]">
            <PropertiesMap properties={listings} className="w-full h-full rounded-3xl border border-white/10 shadow-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
