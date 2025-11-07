'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Star, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

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
}

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

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
              .select('*')
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

        if (favoriteProperties.length > 0) {
          setFavorites(favoriteProperties);
        } else {
          // Mock data for demo
          setFavorites([
            {
              id: '1',
              name: 'Mountain View Cabin',
              location: 'Colorado, USA',
              price: 150,
              rating: 4.9,
              images: ['https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400&h=300&fit=crop'],
              type: 'Cabin',
              amenities: ['Wellness-Friendly', 'Hot Tub', 'Mountain View'],
              guests: 6,
              status: 'active',
            },
            {
              id: '2',
              name: 'Beachfront Bungalow',
              location: 'California, USA',
              price: 200,
              rating: 4.8,
              images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&h=300&fit=crop'],
              type: 'Bungalow',
              amenities: ['Wellness-Friendly', 'Beach Access', 'Private Deck'],
              guests: 4,
              status: 'active',
            },
          ]);
        }
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
          <p className="text-gray-400 mb-8">Properties you've saved for later</p>

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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="group bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 hover:shadow-xl hover:border-emerald-500/50 transition relative"
                >
                  <Link href={`/listings/${favorite.id}`}>
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
                        ${favorite.price} <span className="font-normal text-gray-400 text-sm">/ night</span>
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

