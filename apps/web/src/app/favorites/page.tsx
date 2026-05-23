'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Star, Users, Calendar, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { PROPERTY_BROWSE_LIST_COLUMNS } from '@/lib/propertyPublicSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  enumerateStayNightsYmd,
  formatCalendarDate,
  nightsBetweenYmd,
  todayLocalYmd,
} from '@/lib/dateUtils';

interface Favorite {
  id: string;
  name: string;
  location: string;
  price: number;
  rating?: number;
  images: string[];
  type?: string;
  amenities?: string[];
  guests?: number;
  status?: string;
  isAvailable?: boolean;
}

function formatDateShort(ymd: string): string {
  return formatCalendarDate(ymd, { month: 'short', day: 'numeric' });
}

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const hasDateFilter = !!(checkIn && checkOut);
  const nights = hasDateFilter ? nightsBetweenYmd(checkIn, checkOut) : 0;

  const [debouncedCheckIn, setDebouncedCheckIn] = useState(checkIn);
  const [debouncedCheckOut, setDebouncedCheckOut] = useState(checkOut);

  useEffect(() => {
    const h = window.setTimeout(() => {
      setDebouncedCheckIn(checkIn);
      setDebouncedCheckOut(checkOut);
    }, 450);
    return () => window.clearTimeout(h);
  }, [checkIn, checkOut]);

  const updateDateParams = useCallback(
    (nextCheckIn: string, nextCheckOut: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextCheckIn) params.set('checkIn', nextCheckIn);
      else params.delete('checkIn');
      if (nextCheckOut) params.set('checkOut', nextCheckOut);
      else params.delete('checkOut');
      const qs = params.toString();
      router.replace(qs ? `/favorites?${qs}` : '/favorites', { scroll: false });
    },
    [router, searchParams]
  );

  const clearDates = () => updateDateParams('', '');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const favoriteIdsKey = useMemo(
    () => favorites.map((f) => f.id).join('|'),
    [favorites]
  );

  useEffect(() => {
    const propertyIds = favoriteIdsKey ? favoriteIdsKey.split('|').filter(Boolean) : [];

    if (!debouncedCheckIn || !debouncedCheckOut || propertyIds.length === 0) {
      setFavorites((prev) => prev.map((f) => ({ ...f, isAvailable: undefined })));
      setCheckingAvailability(false);
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseConfigured =
      !!supabaseUrl &&
      supabaseUrl !== '' &&
      supabaseUrl !== 'https://placeholder.supabase.co' &&
      !!supabaseKey &&
      supabaseKey !== '' &&
      supabaseKey !== 'placeholder-key';

    if (!supabaseConfigured) {
      setFavorites((prev) => prev.map((f) => ({ ...f, isAvailable: undefined })));
      return;
    }

    let cancelled = false;
    setCheckingAvailability(true);

    void (async () => {
      try {
        const datesToCheck = enumerateStayNightsYmd(debouncedCheckIn, debouncedCheckOut);
        if (datesToCheck.length === 0) {
          if (!cancelled) {
            setFavorites((prev) => prev.map((f) => ({ ...f, isAvailable: undefined })));
          }
          return;
        }

        const blockedDates: { property_id: string }[] = [];

        const batchSize = 120;
        for (let i = 0; i < propertyIds.length; i += batchSize) {
          const slice = propertyIds.slice(i, i + batchSize);
          const res = await fetch('/api/properties/availability-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyIds: slice, nights: datesToCheck }),
          });
          if (!res.ok) break;
          const json = (await res.json()) as {
            blocked?: { property_id: string }[];
          };
          if (json.blocked?.length) blockedDates.push(...json.blocked);
        }

        if (cancelled) return;

        const unavailableIds = new Set(blockedDates.map((b) => b.property_id));
        setFavorites((prev) =>
          prev.map((f) => ({
            ...f,
            isAvailable: !unavailableIds.has(f.id),
          }))
        );
      } catch (e) {
        console.warn('[Favorites] availability check failed:', e);
        if (!cancelled) {
          setFavorites((prev) => prev.map((f) => ({ ...f, isAvailable: undefined })));
        }
      } finally {
        if (!cancelled) setCheckingAvailability(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedCheckIn, debouncedCheckOut, favoriteIdsKey]);

  const displayedFavorites = useMemo(() => {
    if (!hasDateFilter) return favorites;
    if (checkingAvailability) return [];
    return favorites.filter((f) => f.isAvailable === true);
  }, [favorites, hasDateFilter, checkingAvailability]);

  const loadFavorites = async () => {
    setLoadingFavorites(true);
    try {
      // Try to load from Supabase (cloud storage - syncs across devices)
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        try {
          // Get favorite property IDs from Supabase
          const { data: favoritesData, error } = await supabase
            .from('favorites')
            .select('property_id')
            .eq('user_id', supabaseUser.id);

          if (!error && favoritesData && favoritesData.length > 0) {
            const favoriteIds = favoritesData.map((f: any) => f.property_id);
            
            // Get property details from Supabase or localStorage
            const { data: propertiesData } = await supabase
              .from('properties')
              .select(PROPERTY_BROWSE_LIST_COLUMNS)
              .in('id', favoriteIds)
              .eq('status', 'active');

            if (propertiesData && propertiesData.length > 0) {
              const transformedFavorites: Favorite[] = propertiesData.map((p: any) => ({
                id: p.id,
                name: p.name || p.title,
                location: p.location,
                price: p.price,
                rating: p.rating,
                images: p.images || [],
                type: p.type,
                amenities: p.amenities || [],
                guests: p.guests,
                status: p.status,
              }));
              setFavorites(transformedFavorites);
              setLoadingFavorites(false);
              return;
            }
          } else if (!error && favoritesData && favoritesData.length === 0) {
            // No favorites in Supabase
            setFavorites([]);
            setLoadingFavorites(false);
            return;
          }
        } catch (supabaseError) {
          console.log('Supabase not available, trying localStorage fallback');
        }
      }

      // Try backend API as second option
      if (process.env.NEXT_PUBLIC_API_URL) {
        try {
          const response = await api.get<Favorite[]>('/favorites');
          if (response && Array.isArray(response)) {
            setFavorites(response);
            setLoadingFavorites(false);
            return;
          }
        } catch (apiError) {
          console.log('API not available, using localStorage fallback');
        }
      }

      // Fallback to localStorage (client-side only - won't sync across devices)
      const favoritesKey = `favorites_${user?.id}`;
      const savedFavorites = localStorage.getItem(favoritesKey);
      
      if (savedFavorites) {
        const favoriteIds = JSON.parse(savedFavorites) as string[];
        
        // Get all properties from localStorage
        const allProperties: Favorite[] = [];
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
          if (key.startsWith('properties_')) {
            try {
              const properties = JSON.parse(localStorage.getItem(key) || '[]') as Favorite[];
              allProperties.push(...properties);
            } catch (e) {
              console.error('Error parsing properties:', e);
            }
          }
        });

        // Filter to only favorite properties
        const favoriteProperties = allProperties.filter(p => 
          favoriteIds.includes(p.id) && p.status === 'active'
        );

        setFavorites(favoriteProperties);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavorites([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const removeFavorite = async (propertyId: string) => {
    if (!user) return;
    
    try {
      // Try to remove from Supabase first (cloud storage - syncs across devices)
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        try {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', supabaseUser.id)
            .eq('property_id', propertyId);

          if (!error) {
            setFavorites(prev => prev.filter(f => f.id !== propertyId));
            toast.success('Removed from favorites');
            return;
          }
        } catch (supabaseError) {
          console.log('Supabase not available, trying localStorage fallback');
        }
      }

      // Try backend API as second option
      if (process.env.NEXT_PUBLIC_API_URL) {
        try {
          await api.delete(`/favorites/${propertyId}`);
          setFavorites(prev => prev.filter(f => f.id !== propertyId));
          toast.success('Removed from favorites');
          return;
        } catch (apiError) {
          console.log('API not available, using localStorage fallback');
        }
      }

      // Fallback to localStorage (client-side only - won't sync across devices)
      const favoritesKey = `favorites_${user.id}`;
      const savedFavorites = localStorage.getItem(favoritesKey);
      
      if (savedFavorites) {
        const favoriteIds = JSON.parse(savedFavorites) as string[];
        const updatedFavorites = favoriteIds.filter(id => id !== propertyId);
        localStorage.setItem(favoritesKey, JSON.stringify(updatedFavorites));
        setFavorites(prev => prev.filter(f => f.id !== propertyId));
        toast.success('Removed from favorites');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  if (loading || loadingFavorites) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading favorites...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Favorite Properties</h1>
          <p className="text-gray-400 mb-6">Properties you&apos;ve saved for later</p>

          {favorites.length > 0 ? (
            <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    Filter by stay dates
                  </p>
                  <p className="text-xs text-gray-500">
                    Pick check-in and check-out to see only favorites available for those nights.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
                  <div className="min-w-[140px]">
                    <label className="block text-xs text-gray-400 mb-1.5">Check in</label>
                    <DatePicker
                      value={checkIn}
                      min={todayLocalYmd()}
                      onChange={(dateStr) => {
                        let nextOut = checkOut;
                        if (nextOut && dateStr && nextOut <= dateStr) nextOut = '';
                        updateDateParams(dateStr, nextOut);
                      }}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                      placeholderText="Add date"
                    />
                  </div>
                  <div className="min-w-[140px]">
                    <label className="block text-xs text-gray-400 mb-1.5">Check out</label>
                    <DatePicker
                      value={checkOut}
                      min={checkIn || todayLocalYmd()}
                      onChange={(dateStr) => updateDateParams(checkIn, dateStr)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white"
                      placeholderText="Add date"
                    />
                  </div>
                  {hasDateFilter ? (
                    <button
                      type="button"
                      onClick={clearDates}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 transition"
                    >
                      <X className="w-4 h-4" />
                      Clear dates
                    </button>
                  ) : null}
                </div>
              </div>
              {hasDateFilter ? (
                <p className="mt-4 text-sm text-emerald-400 flex flex-wrap items-center gap-2">
                  {checkingAvailability ? (
                    <span className="text-gray-400">Checking availability…</span>
                  ) : (
                    <>
                      <span>
                        {formatDateShort(checkIn)} – {formatDateShort(checkOut)} ({nights}{' '}
                        {nights === 1 ? 'night' : 'nights'})
                      </span>
                      <span className="text-gray-500">•</span>
                      <span>
                        {displayedFavorites.length} of {favorites.length} available
                      </span>
                    </>
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          {favorites.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800">
              <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No favorites yet</h2>
              <p className="text-gray-400 mb-6">Start exploring properties and save your favorites!</p>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition"
              >
                Browse Properties
              </Link>
            </div>
          ) : checkingAvailability && hasDateFilter ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
                <p className="text-gray-400">Checking availability for your dates…</p>
              </div>
            </div>
          ) : displayedFavorites.length === 0 && hasDateFilter ? (
            <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No favorites available</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                None of your saved properties are free for{' '}
                {formatDateShort(checkIn)} – {formatDateShort(checkOut)}. Try different dates or
                browse more stays.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={clearDates}
                  className="px-5 py-2.5 rounded-xl border border-gray-700 text-white hover:bg-gray-800 transition"
                >
                  Clear dates
                </button>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold transition"
                >
                  Browse properties
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedFavorites.map((favorite) => {
                const listingUrl = `/listings/${favorite.id}${
                  hasDateFilter ? `?checkIn=${checkIn}&checkOut=${checkOut}` : ''
                }`;
                const totalPrice = nights > 0 ? favorite.price * nights : 0;

                return (
                <div
                  key={favorite.id}
                  className="group bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 hover:shadow-xl hover:border-emerald-500/50 transition relative"
                >
                  <Link href={listingUrl}>
                    <div className="relative h-64">
                      <Image
                        src={favorite.images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop'}
                        alt={favorite.name}
                        fill
                        className="object-cover group-hover:scale-110 transition duration-300"
                      />
                      <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Wellness-Friendly
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFavorite(favorite.id);
                        }}
                        className="absolute top-3 left-3 p-2 bg-gray-900/80 hover:bg-red-500/80 rounded-full transition"
                        title="Remove from favorites"
                      >
                        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white text-lg group-hover:text-emerald-500 transition">
                          {favorite.name}
                        </h3>
                        {favorite.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-100">{favorite.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {favorite.location}
                      </p>
                      {favorite.guests && (
                        <p className="text-gray-500 text-xs mb-3 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Up to {favorite.guests} guests
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(favorite.amenities || []).slice(0, 3).map((amenity) => (
                          <span
                            key={amenity}
                            className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                      <p className="text-white font-bold text-lg">
                        ${favorite.price}{' '}
                        <span className="font-normal text-gray-400 text-sm">/ night</span>
                      </p>
                      {hasDateFilter && nights > 0 ? (
                        <p className="text-emerald-400 text-sm mt-1 font-medium">
                          ${totalPrice} total for {nights} {nights === 1 ? 'night' : 'nights'}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

