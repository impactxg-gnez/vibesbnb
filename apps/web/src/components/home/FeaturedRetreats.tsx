'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Retreat {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  image: string;
  amenities: string[];
  badge: string;
}

export function FeaturedRetreats() {
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedRetreats = async () => {
      try {
        const supabase = createClient();
        const { data: propertiesData, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'active')
          .eq('wellness_friendly', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) {
          console.error('Error loading featured retreats:', error);
          setRetreats([]);
          setLoading(false);
          return;
        }

        const featuredRetreats: Retreat[] = (propertiesData || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.title || 'Property',
          location: p.location || '',
          rating: p.rating ? Number(p.rating) : 4.5,
          reviews: 0, // TODO: Get from reviews table
          price: p.price ? Number(p.price) : 0,
          image: p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop',
          amenities: (p.amenities || []).slice(0, 2),
          badge: 'Wellness-friendly',
        }));

        setRetreats(featuredRetreats);
      } catch (error) {
        console.error('Error loading featured retreats:', error);
        setRetreats([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedRetreats();
  }, []);

  if (loading) {
    return null;
  }

  if (retreats.length === 0) {
    return null; // Don't show section if no retreats
  }

  return (
    <div className="container mx-auto px-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Featured <span className="text-primary-500 italic">Retreats</span>
          </h2>
          <p className="text-muted max-w-xl">
            Discover our hand-picked collection of properties designed for your ultimate wellness journey.
          </p>
        </div>
        <Link 
          href="/search" 
          className="group flex items-center gap-2 text-primary-500 font-bold hover:text-primary-400 transition-colors"
        >
          View all properties
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {retreats.map((retreat, index) => (
          <motion.div
            key={retreat.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
          >
            <Link href={`/listings/${retreat.id}`} className="group block h-full">
              <div className="bg-surface rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-primary-500/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group-hover:-translate-y-2 h-full flex flex-col">
                <div className="relative h-72 overflow-hidden">
                  <Image
                    src={retreat.image}
                    alt={retreat.name}
                    fill
                    className="object-cover group-hover:scale-110 transition duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-6 right-6 flex flex-col items-end gap-1">
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
                
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-2xl mb-2 group-hover:text-primary-500 transition-colors line-clamp-1">
                        {retreat.name}
                      </h3>
                      <div className="flex items-center gap-2 text-muted text-sm font-medium">
                        <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{retreat.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">{retreat.rating}</span>
                      <svg className="w-4 h-4 text-primary-500 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-white font-black text-xl">${retreat.price}</span>
                      <span className="text-muted text-sm ml-1">/ night</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    {retreat.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="bg-white/5 text-muted text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

