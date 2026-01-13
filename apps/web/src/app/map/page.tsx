'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import PropertiesMap from '@/components/PropertiesMap';
import Link from 'next/link';

interface Listing {
  id: string;
  name: string;
  location: string;
  price: number;
  coordinates?: { lat: number; lng: number };
  images?: string[];
  status?: 'active' | 'draft' | 'inactive';
}

export default function MapPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      setLoading(true);
      
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
          const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('status', 'active');

          if (error) {
            console.error('[Map] Error loading properties from Supabase:', error);
            supabaseErrorOccurred = true;
          } else {
            propertiesData = data || [];
          }
        }
        
        // Fallback to localStorage if Supabase is not configured or query failed
        if (!isSupabaseConfigured || supabaseErrorOccurred) {
          console.log('[Map] Loading properties from localStorage fallback');
          const allProperties: any[] = [];
          
          // Check all localStorage keys for properties
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('properties_')) {
              try {
                const userProperties = JSON.parse(localStorage.getItem(key) || '[]');
                // Only include active properties
                const activeProperties = userProperties.filter((p: any) => 
                  p.status === 'active' || !p.status
                );
                allProperties.push(...activeProperties);
              } catch (e) {
                console.error('[Map] Error parsing localStorage properties:', e);
              }
            }
          });
          
          if (allProperties.length > 0) {
            propertiesData = allProperties;
            console.log('[Map] Found', allProperties.length, 'properties from localStorage');
          }
        }

        // Transform data to Listing format with coordinates
        const transformedListings: Listing[] = (propertiesData || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.title || 'Untitled Property',
          location: p.location || '',
          price: p.price ? Number(p.price) : 0,
          status: p.status || 'active',
          images: p.images || [],
          coordinates: p.coordinates ? {
            lat: Number(p.coordinates.lat),
            lng: Number(p.coordinates.lng),
          } : (p.latitude && p.longitude ? {
            lat: Number(p.latitude),
            lng: Number(p.longitude),
          } : undefined),
        }));

        // Debug: Log how many listings have coordinates
        const listingsWithCoords = transformedListings.filter(l => l.coordinates);
        console.log('[Map] Listings with coordinates:', {
          total: transformedListings.length,
          withCoords: listingsWithCoords.length,
        });

        setListings(transformedListings);
      } catch (error) {
        console.error('Error loading properties:', error);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-emerald-600 py-6 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Explore Properties on Map
              </h1>
              <p className="text-emerald-50 text-sm md:text-base">
                {loading ? 'Loading...' : `${listings.length} properties available`}
              </p>
            </div>
            <Link
              href="/search"
              className="px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition font-semibold text-sm"
            >
              List View
            </Link>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-white">Loading map...</p>
            </div>
          </div>
        ) : (
          <PropertiesMap 
            properties={listings} 
            className="w-full h-full"
            height="100%"
          />
        )}
      </div>
    </div>
  );
}

