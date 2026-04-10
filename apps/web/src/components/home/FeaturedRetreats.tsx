'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PropertyCardMedia } from '@/components/properties/PropertyCardMedia';

interface Retreat {
  id: string;
  name: string;
  location: string;
  description: string;
  rating: number;
  reviews: number;
  price: number;
  images: string[];
  amenities: string[];
  badge: string;
  bedrooms: number;
  guests: number;
  type?: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl: string;
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

        const rows = propertiesData || [];
        const hostIds = [...new Set(rows.map((p: { host_id?: string }) => p.host_id).filter(Boolean))] as string[];

        let profileById: Record<string, { avatar_url: string | null; full_name: string | null }> = {};
        if (hostIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, avatar_url, full_name')
            .in('id', hostIds);
          (profilesData || []).forEach((row: { id: string; avatar_url: string | null; full_name: string | null }) => {
            profileById[row.id] = { avatar_url: row.avatar_url, full_name: row.full_name };
          });
        }

        const featuredRetreats: Retreat[] = rows.map((p: any) => {
          const hostId = p.host_id || '';
          const prof = hostId ? profileById[hostId] : undefined;
          const hostName = (prof?.full_name || 'Host').trim() || 'Host';
          const hostAvatarUrl =
            prof?.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(hostId || hostName)}`;

          const rawDesc = typeof p.description === 'string' ? p.description.trim() : '';
          const description =
            rawDesc.length > 220 ? `${rawDesc.slice(0, 217).trimEnd()}…` : rawDesc;

          return {
            id: p.id,
            name: p.name || p.title || 'Property',
            location: p.location || '',
            description,
            rating: p.rating ? Number(p.rating) : 4.5,
            reviews: 0,
            price: p.price ? Number(p.price) : 0,
            images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
            amenities: (p.amenities || []).slice(0, 2),
            badge: 'Wellness-friendly',
            bedrooms: p.bedrooms || 1,
            guests: p.guests || 2,
            type: p.type || '',
            hostId,
            hostName,
            hostAvatarUrl,
          };
        });

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
            <div className="group block h-full">
              <div className="bg-surface rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-primary-500/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group-hover:-translate-y-2 h-full flex flex-col">
                <div className="relative overflow-hidden group/media">
                  <PropertyCardMedia
                    images={retreat.images}
                    alt={retreat.name}
                    listingHref={`/listings/${retreat.id}`}
                    propertyId={retreat.id}
                    showWellnessPill
                    mainHeightClass="h-56 md:h-64"
                  />
                  <div
                    className="pointer-events-none absolute left-0 right-0 top-0 h-56 md:h-64 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover/media:opacity-100"
                    aria-hidden
                  />
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex gap-4 items-start mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={retreat.hostAvatarUrl}
                      alt={`Hosted by ${retreat.hostName}`}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-full object-cover border border-white/10 bg-white/5"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/listings/${retreat.id}`}
                        className="block text-left"
                      >
                        <h3 className="text-white font-bold text-2xl mb-1 group-hover:text-primary-500 transition-colors line-clamp-2">
                          {retreat.name}
                        </h3>
                      </Link>
                      {retreat.description ? (
                        <p className="text-muted text-sm leading-relaxed line-clamp-3 mb-2">{retreat.description}</p>
                      ) : null}
                      <div className="flex items-center gap-2 text-muted text-sm font-medium">
                        <svg className="w-4 h-4 shrink-0 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-2">
                          {retreat.type ? `${retreat.type} in ` : ''}{retreat.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Beds and Guests Info */}
                  <div className="flex items-center gap-4 text-muted text-sm mb-4">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {retreat.bedrooms} {retreat.bedrooms === 1 ? 'bed' : 'beds'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {retreat.guests} guests
                    </span>
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
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

